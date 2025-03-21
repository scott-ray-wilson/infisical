import { ForbiddenError, subject } from "@casl/ability";
import { AxiosError } from "axios";

import { ActionProjectType, SecretType } from "@app/db/schemas";
import { TAuditLogServiceFactory } from "@app/ee/services/audit-log/audit-log-service";
import { AuditLogInfo, EventType } from "@app/ee/services/audit-log/audit-log-types";
import { TLicenseServiceFactory } from "@app/ee/services/license/license-service";
import { TPermissionServiceFactory } from "@app/ee/services/permission/permission-service";
import {
  ProjectPermissionSecretActions,
  ProjectPermissionSecretRotationActions,
  ProjectPermissionSub
} from "@app/ee/services/permission/project-permission";
import { SecretRotation, SecretRotationStatus } from "@app/ee/services/secret-rotation-v2/secret-rotation-v2-enums";
import {
  decryptSecretRotationCredentials,
  encryptSecretRotationCredentials,
  listSecretRotationOptions
} from "@app/ee/services/secret-rotation-v2/secret-rotation-v2-fns";
import {
  SECRET_ROTATION_CONNECTION_MAP,
  SECRET_ROTATION_NAME_MAP
} from "@app/ee/services/secret-rotation-v2/secret-rotation-v2-maps";
import {
  TCreateSecretRotationV2DTO,
  TDeleteSecretRotationV2DTO,
  TFindSecretRotationV2ByIdDTO,
  TFindSecretRotationV2ByNameDTO,
  TListSecretRotationsV2ByProjectId,
  TRotateSecretRotationV2,
  TSecretRotationV2,
  TSecretRotationV2GeneratedCredentials,
  TSecretRotationV2Raw,
  TSecretRotationV2WithConnection,
  TUpdateSecretRotationV2DTO
} from "@app/ee/services/secret-rotation-v2/secret-rotation-v2-types";
import { sqlCredentialsRotationFactory } from "@app/ee/services/secret-rotation-v2/shared/sql-credentials";
import { TKeyStoreFactory } from "@app/keystore/keystore";
import { DatabaseErrorCode } from "@app/lib/error-codes";
import { BadRequestError, DatabaseError, NotFoundError } from "@app/lib/errors";
import { OrgServiceActor } from "@app/lib/types";
import { decryptAppConnection } from "@app/services/app-connection/app-connection-fns";
import { TAppConnectionServiceFactory } from "@app/services/app-connection/app-connection-service";
import { ActorType } from "@app/services/auth/auth-type";
import { TKmsServiceFactory } from "@app/services/kms/kms-service";
import { TProjectDALFactory } from "@app/services/project/project-dal";
import { TProjectBotDALFactory } from "@app/services/project-bot/project-bot-dal";
import { TProjectBotServiceFactory } from "@app/services/project-bot/project-bot-service";
import { TResourceMetadataDALFactory } from "@app/services/resource-metadata/resource-metadata-dal";
import { TSecretDALFactory } from "@app/services/secret/secret-dal";
import { createManySecretsRawFnFactory, updateManySecretsRawFnFactory } from "@app/services/secret/secret-fns";
import { TSecretVersionDALFactory } from "@app/services/secret/secret-version-dal";
import { TSecretVersionTagDALFactory } from "@app/services/secret/secret-version-tag-dal";
import { TSecretBlindIndexDALFactory } from "@app/services/secret-blind-index/secret-blind-index-dal";
import { TSecretFolderDALFactory } from "@app/services/secret-folder/secret-folder-dal";
import { TSecretTagDALFactory } from "@app/services/secret-tag/secret-tag-dal";
import { TSecretV2BridgeDALFactory } from "@app/services/secret-v2-bridge/secret-v2-bridge-dal";
import { TSecretVersionV2DALFactory } from "@app/services/secret-v2-bridge/secret-version-dal";
import { TSecretVersionV2TagDALFactory } from "@app/services/secret-v2-bridge/secret-version-tag-dal";

import { TSecretRotationV2DALFactory } from "./secret-rotation-v2-dal";

export type TSecretRotationV2ServiceFactoryDep = {
  secretRotationV2DAL: TSecretRotationV2DALFactory;
  appConnectionService: Pick<TAppConnectionServiceFactory, "connectAppConnectionById">;
  permissionService: Pick<TPermissionServiceFactory, "getProjectPermission" | "getOrgPermission">;
  projectBotService: Pick<TProjectBotServiceFactory, "getBotKey">;
  kmsService: Pick<TKmsServiceFactory, "createCipherPairWithDataKey">;
  licenseService: Pick<TLicenseServiceFactory, "getPlan">;
  auditLogService: Pick<TAuditLogServiceFactory, "createAuditLog">;
  keyStore: Pick<TKeyStoreFactory, "acquireLock" | "setItemWithExpiry" | "getItem">;
  folderDAL: TSecretFolderDALFactory;
  secretV2BridgeDAL: Pick<
    TSecretV2BridgeDALFactory,
    | "findByFolderId"
    | "find"
    | "insertMany"
    | "upsertSecretReferences"
    | "findBySecretKeys"
    | "bulkUpdate"
    | "deleteMany"
  >;
  projectDAL: TProjectDALFactory;
  projectBotDAL: TProjectBotDALFactory;
  secretDAL: TSecretDALFactory;
  secretVersionDAL: TSecretVersionDALFactory;
  secretBlindIndexDAL: TSecretBlindIndexDALFactory;
  secretTagDAL: TSecretTagDALFactory;
  secretVersionTagDAL: TSecretVersionTagDALFactory;
  secretVersionV2BridgeDAL: Pick<TSecretVersionV2DALFactory, "insertMany" | "findLatestVersionMany">;
  secretVersionTagV2BridgeDAL: Pick<TSecretVersionV2TagDALFactory, "insertMany">;
  resourceMetadataDAL: Pick<TResourceMetadataDALFactory, "insertMany" | "delete">;
};

export type TSecretRotationV2ServiceFactory = ReturnType<typeof secretRotationV2ServiceFactory>;

const MAX_GENERATED_CREDENTIALS_LENGTH = 2;

type TRotationFactory = (rotation: Pick<TSecretRotationV2WithConnection, "connection" | "parameters">) => {
  issue: (
    callback: (newCredentials: TSecretRotationV2GeneratedCredentials[number]) => Promise<TSecretRotationV2>
  ) => Promise<TSecretRotationV2>;
  revoke: (
    generatedCredentials: TSecretRotationV2GeneratedCredentials[number],
    callback: () => Promise<TSecretRotationV2>
  ) => Promise<TSecretRotationV2>;
  rotate: (
    credentialsToRevoke: TSecretRotationV2GeneratedCredentials[number],
    callback: (newCredentials: TSecretRotationV2GeneratedCredentials[number]) => Promise<TSecretRotationV2>
  ) => Promise<TSecretRotationV2>;
  formatActiveCredentialsAsSecrets: (
    secretRotation: TSecretRotationV2,
    generatedCredentials: TSecretRotationV2GeneratedCredentials
  ) => { secretName: string; secretValue: string; type: SecretType }[];
  throwOnInvalidParameters: () => Promise<void>;
};

const SECRET_ROTATION_FACTORY_MAP: Record<SecretRotation, TRotationFactory> = {
  [SecretRotation.PostgresCredentials]: sqlCredentialsRotationFactory,
  [SecretRotation.MsSqlCredentials]: sqlCredentialsRotationFactory
};

export const secretRotationV2ServiceFactory = ({
  secretRotationV2DAL,
  folderDAL,
  permissionService,
  appConnectionService,
  projectBotService,
  licenseService,
  kmsService,
  auditLogService,
  projectDAL,
  secretV2BridgeDAL,
  projectBotDAL,
  secretDAL,
  secretVersionDAL,
  secretBlindIndexDAL,
  secretTagDAL,
  secretVersionTagDAL,
  secretVersionV2BridgeDAL,
  secretVersionTagV2BridgeDAL,
  resourceMetadataDAL
}: TSecretRotationV2ServiceFactoryDep) => {
  const $createManySecretsRawFn = createManySecretsRawFnFactory({
    projectDAL,
    projectBotDAL,
    secretDAL,
    secretVersionDAL,
    secretBlindIndexDAL,
    secretTagDAL,
    secretVersionTagDAL,
    folderDAL,
    kmsService,
    secretVersionV2BridgeDAL,
    secretV2BridgeDAL,
    secretVersionTagV2BridgeDAL,
    resourceMetadataDAL
  });

  const $updateManySecretsRawFn = updateManySecretsRawFnFactory({
    projectDAL,
    projectBotDAL,
    secretDAL,
    secretVersionDAL,
    secretBlindIndexDAL,
    secretTagDAL,
    secretVersionTagDAL,
    folderDAL,
    kmsService,
    secretVersionV2BridgeDAL,
    secretV2BridgeDAL,
    secretVersionTagV2BridgeDAL,
    resourceMetadataDAL
  });

  const listSecretRotationsByProjectId = async (
    { projectId, type }: TListSecretRotationsV2ByProjectId,
    actor: OrgServiceActor
  ) => {
    const plan = await licenseService.getPlan(actor.orgId);

    if (!plan.secretRotation)
      throw new BadRequestError({
        message: "Failed to access secret rotations due to plan restriction. Upgrade plan to access secret rotations."
      });

    const { permission } = await permissionService.getProjectPermission({
      actor: actor.type,
      actorId: actor.id,
      actorAuthMethod: actor.authMethod,
      actorOrgId: actor.orgId,
      actionProjectType: ActionProjectType.SecretManager,
      projectId
    });

    ForbiddenError.from(permission).throwUnlessCan(
      ProjectPermissionSecretRotationActions.Read,
      ProjectPermissionSub.SecretRotation
    );

    const secretRotations = await secretRotationV2DAL.find({
      ...(type && { type }),
      projectId
    });

    return secretRotations as TSecretRotationV2[];
  };

  const findSecretRotationById = async ({ type, rotationId }: TFindSecretRotationV2ByIdDTO, actor: OrgServiceActor) => {
    const plan = await licenseService.getPlan(actor.orgId);

    if (!plan.secretRotation)
      throw new BadRequestError({
        message: "Failed to access secret rotation due to plan restriction. Upgrade plan to access secret rotations."
      });

    const secretRotation = await secretRotationV2DAL.findById(rotationId);

    if (!secretRotation)
      throw new NotFoundError({
        message: `Could not find ${SECRET_ROTATION_NAME_MAP[type]} Rotation with ID "${rotationId}"`
      });

    const { permission } = await permissionService.getProjectPermission({
      actor: actor.type,
      actorId: actor.id,
      actorAuthMethod: actor.authMethod,
      actorOrgId: actor.orgId,
      actionProjectType: ActionProjectType.SecretManager,
      projectId: secretRotation.projectId
    });

    ForbiddenError.from(permission).throwUnlessCan(
      ProjectPermissionSecretRotationActions.Read,
      ProjectPermissionSub.SecretRotation
    );

    if (secretRotation.connection.app !== SECRET_ROTATION_CONNECTION_MAP[type])
      throw new BadRequestError({
        message: `Secret Rotation with ID "${secretRotation.id}" is not configured for ${SECRET_ROTATION_NAME_MAP[type]}`
      });

    return secretRotation as TSecretRotationV2;
  };

  const findSecretRotationGeneratedCredentialsById = async (
    { type, rotationId }: TFindSecretRotationV2ByIdDTO,
    actor: OrgServiceActor
  ) => {
    const plan = await licenseService.getPlan(actor.orgId);

    if (!plan.secretRotation)
      throw new BadRequestError({
        message:
          "Failed to access secret rotation credentials due to plan restriction. Upgrade plan to access secret rotations credentials."
      });

    const secretRotation = await secretRotationV2DAL.findById(rotationId);

    if (!secretRotation)
      throw new NotFoundError({
        message: `Could not find ${SECRET_ROTATION_NAME_MAP[type]} Rotation with ID "${rotationId}"`
      });

    const { permission } = await permissionService.getProjectPermission({
      actor: actor.type,
      actorId: actor.id,
      actorAuthMethod: actor.authMethod,
      actorOrgId: actor.orgId,
      actionProjectType: ActionProjectType.SecretManager,
      projectId: secretRotation.projectId
    });

    ForbiddenError.from(permission).throwUnlessCan(
      ProjectPermissionSecretRotationActions.ReadCredentials,
      ProjectPermissionSub.SecretRotation
    );

    if (secretRotation.connection.app !== SECRET_ROTATION_CONNECTION_MAP[type])
      throw new BadRequestError({
        message: `Secret Rotation with ID "${secretRotation.id}" is not configured for ${SECRET_ROTATION_NAME_MAP[type]}`
      });

    const generatedCredentials = await decryptSecretRotationCredentials({
      projectId: secretRotation.projectId,
      encryptedGeneratedCredentials: secretRotation.encryptedGeneratedCredentials,
      kmsService
    });

    return { generatedCredentials, activeIndex: secretRotation.activeIndex, projectId: secretRotation.projectId };
  };

  const findSecretRotationByName = async (
    { type, rotationName, projectId }: TFindSecretRotationV2ByNameDTO,
    actor: OrgServiceActor
  ) => {
    const plan = await licenseService.getPlan(actor.orgId);

    if (!plan.secretRotation)
      throw new BadRequestError({
        message: "Failed to access secret rotation due to plan restriction. Upgrade plan to access secret rotations."
      });

    // we prevent conflicting names within a project
    const secretRotation = await secretRotationV2DAL.findOne({
      name: rotationName,
      projectId
    });

    if (!secretRotation)
      throw new NotFoundError({
        message: `Could not find ${SECRET_ROTATION_NAME_MAP[type]} Rotation with name "${rotationName}"`
      });

    const { permission } = await permissionService.getProjectPermission({
      actor: actor.type,
      actorId: actor.id,
      actorAuthMethod: actor.authMethod,
      actorOrgId: actor.orgId,
      actionProjectType: ActionProjectType.SecretManager,
      projectId: secretRotation.projectId
    });

    ForbiddenError.from(permission).throwUnlessCan(
      ProjectPermissionSecretRotationActions.Read,
      ProjectPermissionSub.SecretRotation
    );

    if (secretRotation.connection.app !== SECRET_ROTATION_CONNECTION_MAP[type])
      throw new BadRequestError({
        message: `Secret Rotation with ID "${secretRotation.id}" is not configured for ${SECRET_ROTATION_NAME_MAP[type]}`
      });

    return secretRotation as TSecretRotationV2;
  };

  const createSecretRotation = async (
    { projectId, secretPath, environment, ...params }: TCreateSecretRotationV2DTO,
    actor: OrgServiceActor
  ) => {
    const plan = await licenseService.getPlan(actor.orgId);

    if (!plan.secretRotation)
      throw new BadRequestError({
        message: "Failed to create secret rotation due to plan restriction. Upgrade plan to create secret rotations."
      });

    const { permission } = await permissionService.getProjectPermission({
      actor: actor.type,
      actorId: actor.id,
      actorAuthMethod: actor.authMethod,
      actorOrgId: actor.orgId,
      actionProjectType: ActionProjectType.SecretManager,
      projectId
    });

    const { shouldUseSecretV2Bridge } = await projectBotService.getBotKey(projectId);

    if (!shouldUseSecretV2Bridge)
      throw new BadRequestError({ message: "Project version does not support Secret Rotation V2" });

    ForbiddenError.from(permission).throwUnlessCan(
      ProjectPermissionSecretRotationActions.Create,
      ProjectPermissionSub.SecretRotation
    );

    ForbiddenError.from(permission).throwUnlessCan(
      ProjectPermissionSecretActions.Create,
      subject(ProjectPermissionSub.Secrets, { environment, secretPath })
    );

    const folder = await folderDAL.findBySecretPath(projectId, environment, secretPath);

    if (!folder)
      throw new BadRequestError({
        message: `Could not find folder with path "${secretPath}" in environment "${environment}" for project with ID "${projectId}"`
      });

    const typeApp = SECRET_ROTATION_CONNECTION_MAP[params.type];

    // validates permission to connect and app is valid for sync type
    const appConnection = await appConnectionService.connectAppConnectionById(typeApp, params.connectionId, actor);

    const rotationFactory = SECRET_ROTATION_FACTORY_MAP[params.type]({
      parameters: params.parameters,
      connection: appConnection
    } as TSecretRotationV2WithConnection);

    // throws if any invalid
    await rotationFactory.throwOnInvalidParameters();

    try {
      const secretRotation = await rotationFactory.issue(async (newCredentials) => {
        const generatedCredentials = [newCredentials];

        const encryptedGeneratedCredentials = await encryptSecretRotationCredentials({
          generatedCredentials,
          projectId,
          kmsService
        });

        return secretRotationV2DAL.transaction(async (tx) => {
          const createdRotation = (await secretRotationV2DAL.create(
            {
              folderId: folder.id,
              ...params,
              encryptedGeneratedCredentials,
              projectId
            },
            tx
          )) as TSecretRotationV2;

          const generatedSecrets = rotationFactory.formatActiveCredentialsAsSecrets(
            createdRotation,
            generatedCredentials
          );

          const secrets = (await $createManySecretsRawFn({
            projectId,
            environment,
            path: secretPath,
            secrets: generatedSecrets
          })) as { key: string; id: string }[];

          await secretRotationV2DAL.insertSecretMappings(
            secrets.map((secret) => ({
              secretKey: secret.key,
              secretId: secret.id,
              rotationId: createdRotation.id
            })),
            tx
          );

          return createdRotation;
        });
      });

      return secretRotation;
    } catch (err) {
      if (err instanceof DatabaseError) {
        const errorCode = (err.error as { code: string })?.code;

        switch (errorCode) {
          case DatabaseErrorCode.UniqueViolation:
            throw new BadRequestError({
              message: `A Secret Rotation with the name "${params.name}" already exists for the project with ID "${folder.projectId}"`
            });
          case DatabaseErrorCode.SyntaxError:
            throw new BadRequestError({
              message: `One or more of the SQL parameter statements contains a syntax error`
            });
          default:
            throw err;
        }
      }

      throw err;
    }
  };

  const updateSecretRotation = async (
    { type, rotationId, secretPath, environment, ...params }: TUpdateSecretRotationV2DTO,
    actor: OrgServiceActor
  ) => {
    const plan = await licenseService.getPlan(actor.orgId);

    if (!plan.secretRotation)
      throw new BadRequestError({
        message: "Failed to update secret rotation due to plan restriction. Upgrade plan to update secret rotations."
      });

    const secretRotation = await secretRotationV2DAL.findById(rotationId);

    if (!secretRotation)
      throw new NotFoundError({
        message: `Could not find ${SECRET_ROTATION_NAME_MAP[type]} Rotation with ID ${rotationId}`
      });

    const { permission } = await permissionService.getProjectPermission({
      actor: actor.type,
      actorId: actor.id,
      actorAuthMethod: actor.authMethod,
      actorOrgId: actor.orgId,
      actionProjectType: ActionProjectType.SecretManager,
      projectId: secretRotation.projectId
    });

    ForbiddenError.from(permission).throwUnlessCan(
      ProjectPermissionSecretRotationActions.Edit,
      ProjectPermissionSub.SecretRotation
    );

    if (secretRotation.connection.app !== SECRET_ROTATION_CONNECTION_MAP[type])
      throw new BadRequestError({
        message: `Secret sync with ID "${secretRotation.id}" is not configured for ${SECRET_ROTATION_NAME_MAP[type]}`
      });

    let { folderId } = secretRotation;

    if (
      (secretPath && secretPath !== secretRotation.folder.path) ||
      (environment && environment !== secretRotation.environment.slug)
    ) {
      const updatedEnvironment = environment ?? secretRotation.environment.slug;
      const updatedSecretPath = secretPath ?? secretRotation.folder.path;

      // TODO: get secrets to determine delete permission

      // ForbiddenError.from(permission).throwUnlessCan(
      //     ProjectPermissionSecretActions.Create,
      //     subject(ProjectPermissionSub.Secrets, { environment, secretPath })
      // );

      ForbiddenError.from(permission).throwUnlessCan(
        ProjectPermissionSecretActions.Create,
        subject(ProjectPermissionSub.Secrets, { environment: updatedEnvironment, secretPath: updatedSecretPath })
      );

      const newFolder = await folderDAL.findBySecretPath(
        secretRotation.projectId,
        updatedEnvironment,
        updatedSecretPath
      );

      if (!newFolder)
        throw new BadRequestError({
          message: `Could not find folder with path "${secretPath}" in environment "${environment}" for project with ID "${secretRotation.projectId}"`
        });

      folderId = newFolder.id;
    }

    if (params.parameters) {
      const appConnection = await decryptAppConnection(secretRotation.connection, kmsService);

      const rotationFactory = SECRET_ROTATION_FACTORY_MAP[type]({
        parameters: params.parameters,
        connection: appConnection
      } as TSecretRotationV2WithConnection);

      // throws if any invalid
      await rotationFactory.throwOnInvalidParameters();
    }

    try {
      const updatedSecretRotation = await secretRotationV2DAL.updateById(rotationId, {
        ...params,
        folderId
      });

      return updatedSecretRotation as TSecretRotationV2;
    } catch (err) {
      if (err instanceof DatabaseError) {
        const errorCode = (err.error as { code: string })?.code;

        switch (errorCode) {
          case DatabaseErrorCode.UniqueViolation:
            throw new BadRequestError({
              message: `A Secret Rotation with the name "${params.name}" already exists for the project with ID "${secretRotation.projectId}"`
            });
          case DatabaseErrorCode.SyntaxError:
            throw new BadRequestError({
              message: `One or more of the SQL parameter statements contains a syntax error`
            });
          default:
            throw err;
        }
      }

      throw err;
    }
  };

  const deleteSecretRotation = async (
    { type, rotationId, removeSecrets }: TDeleteSecretRotationV2DTO,
    actor: OrgServiceActor
  ) => {
    const plan = await licenseService.getPlan(actor.orgId);

    if (!plan.secretRotation)
      throw new BadRequestError({
        message: "Failed to access secret rotation due to plan restriction. Upgrade plan to access secret rotations."
      });

    const secretRotation = await secretRotationV2DAL.findById(rotationId);

    if (!secretRotation)
      throw new NotFoundError({
        message: `Could not find ${SECRET_ROTATION_NAME_MAP[type]} Rotation with ID "${rotationId}"`
      });

    const { permission } = await permissionService.getProjectPermission({
      actor: actor.type,
      actorId: actor.id,
      actorAuthMethod: actor.authMethod,
      actorOrgId: actor.orgId,
      actionProjectType: ActionProjectType.SecretManager,
      projectId: secretRotation.projectId
    });

    ForbiddenError.from(permission).throwUnlessCan(
      ProjectPermissionSecretRotationActions.Delete,
      ProjectPermissionSub.SecretRotation
    );

    if (secretRotation.connection.app !== SECRET_ROTATION_CONNECTION_MAP[type])
      throw new BadRequestError({
        message: `Secret sync with ID "${secretRotation.id}" is not configured for ${SECRET_ROTATION_NAME_MAP[type]}`
      });

    if (removeSecrets) {
      // TODO: get secrets to determine remove permissions
      // ForbiddenError.from(permission).throwUnlessCan(
      //   ProjectPermissionSecretRotationActions.RemoveSecrets,
      //   ProjectPermissionSub.SecretRotations
      // );
      // TODO: remove secrets
    } else {
      // TODO delete relations
      // TODO revoke creds
    }

    await secretRotationV2DAL.deleteById(rotationId);

    return secretRotation as TSecretRotationV2;
  };

  const rotateGeneratedCredentials = async (secretRotation: TSecretRotationV2Raw, auditLogInfo?: AuditLogInfo) => {
    try {
      const { connection, encryptedGeneratedCredentials, activeIndex, projectId, type, parameters } = secretRotation;

      const appConnection = await decryptAppConnection(connection, kmsService);

      const generatedCredentials = await decryptSecretRotationCredentials({
        projectId,
        encryptedGeneratedCredentials,
        kmsService
      });

      const inactiveIndex = (activeIndex + 1) % MAX_GENERATED_CREDENTIALS_LENGTH;

      const inactiveCredentials = generatedCredentials[inactiveIndex];

      const rotationFactory = SECRET_ROTATION_FACTORY_MAP[type as SecretRotation]({
        parameters,
        connection: appConnection
      } as TSecretRotationV2WithConnection);

      const updatedSecretRotation = await rotationFactory.rotate(inactiveCredentials, async (newCredentials) => {
        const updatedCredentials = [...generatedCredentials];
        updatedCredentials[inactiveIndex] = newCredentials;

        const encryptedUpdatedCredentials = await encryptSecretRotationCredentials({
          projectId,
          generatedCredentials: updatedCredentials,
          kmsService
        });

        return secretRotationV2DAL.transaction(async (tx) => {
          const updatedRotation = (await secretRotationV2DAL.updateById(
            secretRotation.id,
            {
              encryptedGeneratedCredentials: encryptedUpdatedCredentials,
              activeIndex: inactiveIndex,
              lastRotatedAt: new Date(),
              rotationStatus: SecretRotationStatus.Success,
              lastRotationJobId: null,
              rotationStatusMessage: null
            },
            tx
          )) as TSecretRotationV2;

          const secretsData = rotationFactory.formatActiveCredentialsAsSecrets(updatedRotation, updatedCredentials);

          throw new Error("Pretend Error");

          // TODO: ideally this would be part of transaction
          await $updateManySecretsRawFn({
            projectId,
            path: secretRotation.folder.path,
            environment: secretRotation.environment.slug,
            secrets: secretsData.map((secretData) => ({
              secretName: secretData.secretName,
              secretValue: secretData.secretValue,
              type: secretData.type
            }))
          });

          await auditLogService.createAuditLog({
            ...(auditLogInfo ?? {
              actor: {
                type: ActorType.PLATFORM,
                metadata: {}
              }
            }),
            projectId: updatedRotation.projectId,
            event: {
              type: EventType.ROTATE_SECRET_ROTATION,
              metadata: {
                type: updatedRotation.type,
                rotationId: updatedRotation.id,
                connectionId: updatedRotation.connectionId,
                folderId: updatedRotation.folderId,
                parameters: updatedRotation.parameters,
                rotationStatus: updatedRotation.rotationStatus,
                occurredAt: new Date(),
                rotationStatusMessage: updatedRotation.rotationStatusMessage
              }
            }
          });

          return updatedRotation;
        });
      });

      return updatedSecretRotation;
    } catch (error) {
      const updatedRotation = (await secretRotationV2DAL.updateById(secretRotation.id, {
        rotationStatus: SecretRotationStatus.Failed,
        lastRotationJobId: null,
        rotationStatusMessage:
          // eslint-disable-next-line no-nested-ternary
          error instanceof AxiosError
            ? error?.response?.data
              ? JSON.stringify(error?.response?.data)
              : error?.message
            : (error as Error)?.message ?? "An unknown error occurred."
      })) as TSecretRotationV2;

      await auditLogService.createAuditLog({
        ...(auditLogInfo ?? {
          actor: {
            type: ActorType.PLATFORM,
            metadata: {}
          }
        }),
        projectId: updatedRotation.projectId,
        event: {
          type: EventType.ROTATE_SECRET_ROTATION,
          metadata: {
            type: updatedRotation.type,
            rotationId: updatedRotation.id,
            connectionId: updatedRotation.connectionId,
            folderId: updatedRotation.folderId,
            parameters: updatedRotation.parameters,
            rotationStatus: updatedRotation.rotationStatus,
            occurredAt: new Date(),
            rotationStatusMessage: updatedRotation.rotationStatusMessage
          }
        }
      });

      throw error;
    }
  };

  const rotateSecretRotation = async ({ rotationId, type }: TRotateSecretRotationV2, actor: OrgServiceActor) => {
    const plan = await licenseService.getPlan(actor.orgId);

    if (!plan.secretRotation)
      throw new BadRequestError({
        message: "Failed to rotate secret rotation due to plan restriction. Upgrade plan to rotate secret rotations."
      });

    const secretRotation = await secretRotationV2DAL.findById(rotationId);

    if (!secretRotation)
      throw new NotFoundError({
        message: `Could not find ${SECRET_ROTATION_NAME_MAP[type]} Rotation with ID "${rotationId}"`
      });

    const { permission } = await permissionService.getProjectPermission({
      actor: actor.type,
      actorId: actor.id,
      actorAuthMethod: actor.authMethod,
      actorOrgId: actor.orgId,
      actionProjectType: ActionProjectType.SecretManager,
      projectId: secretRotation.projectId
    });

    ForbiddenError.from(permission).throwUnlessCan(
      ProjectPermissionSecretRotationActions.Rotate,
      ProjectPermissionSub.SecretRotation
    );

    if (secretRotation.connection.app !== SECRET_ROTATION_CONNECTION_MAP[type])
      throw new BadRequestError({
        message: `Secret sync with ID "${secretRotation.id}" is not configured for ${SECRET_ROTATION_NAME_MAP[type]}`
      });

    const updatedRotation = await rotateGeneratedCredentials(secretRotation);

    return updatedRotation;
  };

  return {
    listSecretRotationOptions,
    listSecretRotationsByProjectId,
    createSecretRotation,
    updateSecretRotation,
    findSecretRotationById,
    findSecretRotationByName,
    deleteSecretRotation,
    findSecretRotationGeneratedCredentialsById,
    rotateSecretRotation,
    rotateGeneratedCredentials
  };
};
