import { ForbiddenError, subject } from "@casl/ability";

import { ActionProjectType, SecretType, TableName } from "@app/db/schemas";
import { TAuditLogServiceFactory } from "@app/ee/services/audit-log/audit-log-service";
import { AuditLogInfo, EventType } from "@app/ee/services/audit-log/audit-log-types";
import { TLicenseServiceFactory } from "@app/ee/services/license/license-service";
import { hasSecretReadValueOrDescribePermission } from "@app/ee/services/permission/permission-fns";
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
  listSecretRotationOptions,
  parseRotationErrorMessage
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
  TGetDashboardSecretRotationsV2,
  TGetDashboardSecretRotationV2Count,
  TListSecretRotationsV2ByProjectId,
  TQuickSearchSecretRotationsV2,
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
import { OrderByDirection, OrgServiceActor } from "@app/lib/types";
import { decryptAppConnection } from "@app/services/app-connection/app-connection-fns";
import { TAppConnectionServiceFactory } from "@app/services/app-connection/app-connection-service";
import { ActorType } from "@app/services/auth/auth-type";
import { TKmsServiceFactory } from "@app/services/kms/kms-service";
import { KmsDataKey } from "@app/services/kms/kms-types";
import { TProjectDALFactory } from "@app/services/project/project-dal";
import { TProjectBotDALFactory } from "@app/services/project-bot/project-bot-dal";
import { TProjectBotServiceFactory } from "@app/services/project-bot/project-bot-service";
import { TResourceMetadataDALFactory } from "@app/services/resource-metadata/resource-metadata-dal";
import { TSecretDALFactory } from "@app/services/secret/secret-dal";
import { createManySecretsRawFnFactory, updateManySecretsRawFnFactory } from "@app/services/secret/secret-fns";
import { SecretsOrderBy } from "@app/services/secret/secret-types";
import { TSecretVersionDALFactory } from "@app/services/secret/secret-version-dal";
import { TSecretVersionTagDALFactory } from "@app/services/secret/secret-version-tag-dal";
import { TSecretBlindIndexDALFactory } from "@app/services/secret-blind-index/secret-blind-index-dal";
import { TSecretFolderDALFactory } from "@app/services/secret-folder/secret-folder-dal";
import { TSecretTagDALFactory } from "@app/services/secret-tag/secret-tag-dal";
import { TSecretV2BridgeDALFactory } from "@app/services/secret-v2-bridge/secret-v2-bridge-dal";
import { reshapeBridgeSecret } from "@app/services/secret-v2-bridge/secret-v2-bridge-fns";
import { TSecretV2BridgeServiceFactory } from "@app/services/secret-v2-bridge/secret-v2-bridge-service";
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
  secretV2BridgeService: Pick<TSecretV2BridgeServiceFactory, "deleteManySecret">;
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
    generatedCredentials: TSecretRotationV2GeneratedCredentials,
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
  resourceMetadataDAL,
  secretV2BridgeService
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

    return secretRotations.filter((rotation) =>
      permission.can(
        ProjectPermissionSecretRotationActions.Read,
        subject(ProjectPermissionSub.SecretRotation, {
          environment: rotation.environment.slug,
          secretPath: rotation.folder.path
        })
      )
    ) as TSecretRotationV2[];
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
      subject(ProjectPermissionSub.SecretRotation, {
        environment: secretRotation.environment.slug,
        secretPath: secretRotation.folder.path
      })
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
      subject(ProjectPermissionSub.SecretRotation, {
        environment: secretRotation.environment.slug,
        secretPath: secretRotation.folder.path
      })
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

    return {
      generatedCredentials,
      secretRotation: secretRotation as TSecretRotationV2
    };
  };

  const findSecretRotationByName = async (
    { type, rotationName, secretPath, environment, projectId }: TFindSecretRotationV2ByNameDTO,
    actor: OrgServiceActor
  ) => {
    const plan = await licenseService.getPlan(actor.orgId);

    if (!plan.secretRotation)
      throw new BadRequestError({
        message: "Failed to access secret rotation due to plan restriction. Upgrade plan to access secret rotations."
      });

    const folder = await folderDAL.findBySecretPath(projectId, environment, secretPath);

    if (!folder)
      throw new BadRequestError({
        message: `Could not find folder with path "${secretPath}" in environment "${environment}" for project with ID "${projectId}"`
      });

    // we prevent conflicting names within a folder
    const secretRotation = await secretRotationV2DAL.findOne({
      name: rotationName,
      folderId: folder.id
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
      projectId
    });

    ForbiddenError.from(permission).throwUnlessCan(
      ProjectPermissionSecretRotationActions.Read,
      subject(ProjectPermissionSub.SecretRotation, {
        environment: secretRotation.environment.slug,
        secretPath: secretRotation.folder.path
      })
    );

    if (secretRotation.connection.app !== SECRET_ROTATION_CONNECTION_MAP[type])
      throw new BadRequestError({
        message: `Secret Rotation with ID "${secretRotation.id}" is not configured for ${SECRET_ROTATION_NAME_MAP[type]}`
      });

    return secretRotation as TSecretRotationV2;
  };

  const createSecretRotation = async (
    {
      projectId,
      secretPath,
      environment,
      rotateAtUtc = { hours: 0, minutes: 0 },
      ...params
    }: TCreateSecretRotationV2DTO,
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
      subject(ProjectPermissionSub.SecretRotation, { environment, secretPath })
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

    try {
      await rotationFactory.throwOnInvalidParameters();

      const currentTime = new Date();

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
              rotateAtUtc,
              rotationStatus: SecretRotationStatus.Success,
              lastRotationAttemptedAt: currentTime,
              lastRotatedAt: currentTime
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
          case DatabaseErrorCode.InsufficientPrivilege:
            throw new BadRequestError({
              message: "Insufficient privilege to execute one or more of the SQL parameter statements"
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
      subject(ProjectPermissionSub.SecretRotation, {
        environment: secretRotation.environment.slug,
        secretPath: secretRotation.folder.path
      })
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

    try {
      if (params.parameters) {
        const appConnection = await decryptAppConnection(secretRotation.connection, kmsService);

        const rotationFactory = SECRET_ROTATION_FACTORY_MAP[type]({
          parameters: params.parameters,
          connection: appConnection
        } as TSecretRotationV2WithConnection);

        await rotationFactory.throwOnInvalidParameters();
      }

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
          case DatabaseErrorCode.InsufficientPrivilege:
            throw new BadRequestError({
              message: "Insufficient privilege to execute one or more of the SQL parameter statements"
            });
          default:
            throw err;
        }
      }

      throw err;
    }
  };

  const deleteSecretRotation = async (
    { type, rotationId, deleteSecrets, revokeGeneratedCredentials }: TDeleteSecretRotationV2DTO,
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

    const { folder, environment, projectId, encryptedGeneratedCredentials, connection, parameters } = secretRotation;

    const { permission } = await permissionService.getProjectPermission({
      actor: actor.type,
      actorId: actor.id,
      actorAuthMethod: actor.authMethod,
      actorOrgId: actor.orgId,
      actionProjectType: ActionProjectType.SecretManager,
      projectId
    });

    ForbiddenError.from(permission).throwUnlessCan(
      ProjectPermissionSecretRotationActions.Delete,
      subject(ProjectPermissionSub.SecretRotation, {
        environment: environment.slug,
        secretPath: folder.path
      })
    );

    if (secretRotation.connection.app !== SECRET_ROTATION_CONNECTION_MAP[type])
      throw new BadRequestError({
        message: `Secret sync with ID "${secretRotation.id}" is not configured for ${SECRET_ROTATION_NAME_MAP[type]}`
      });

    const deleteTransaction = secretRotationV2DAL.transaction(async (tx) => {
      const secretMappings = await secretRotationV2DAL.findSecretMappingsByRotationId(secretRotation.id);

      if (deleteSecrets) {
        await secretV2BridgeService.deleteManySecret(
          {
            secretPath: folder.path,
            environment: environment.slug,
            projectId,
            actorAuthMethod: actor.authMethod,
            actorOrgId: actor.orgId,
            actor: actor.type,
            actorId: actor.id,
            secrets: secretMappings.map(({ secretKey }) => ({
              secretKey,
              type: SecretType.Shared
            }))
          },
          tx
        );
      }

      const deletedRotation = await secretRotationV2DAL.deleteById(rotationId, tx);

      return deletedRotation as TSecretRotationV2;
    });

    if (revokeGeneratedCredentials) {
      const appConnection = await decryptAppConnection(connection, kmsService);

      const rotationFactory = SECRET_ROTATION_FACTORY_MAP[type]({
        parameters,
        connection: appConnection
      } as TSecretRotationV2WithConnection);

      const generatedCredentials = await decryptSecretRotationCredentials({
        encryptedGeneratedCredentials,
        projectId,
        kmsService
      });

      await rotationFactory.revoke(generatedCredentials, () => deleteTransaction);
    } else {
      await deleteTransaction;
    }

    return secretRotation as TSecretRotationV2;
  };

  const rotateGeneratedCredentials = async (secretRotation: TSecretRotationV2Raw, auditLogInfo?: AuditLogInfo) => {
    const { connection, encryptedGeneratedCredentials, activeIndex, projectId, type, parameters } = secretRotation;

    try {
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
              lastRotationAttemptedAt: new Date(),
              rotationStatus: SecretRotationStatus.Success,
              // rotationJobId: null, TODO
              encryptedLastRotationMessage: null
            },
            tx
          )) as TSecretRotationV2;

          const secretsData = rotationFactory.formatActiveCredentialsAsSecrets(updatedRotation, updatedCredentials);

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
                status: SecretRotationStatus.Success,
                occurredAt: new Date(),
                message: null
                // TODO: jobId, mapping
              }
            }
          });

          return updatedRotation;
        });
      });

      return updatedSecretRotation;
    } catch (error) {
      // TODO: redact message if sensitive for logs
      const errorMessage = parseRotationErrorMessage(error);

      const { encryptor } = await kmsService.createCipherPairWithDataKey({
        type: KmsDataKey.SecretManager,
        projectId
      });

      const { cipherTextBlob: encryptedMessage } = encryptor({
        plainText: Buffer.from(errorMessage)
      });

      const updatedRotation = (await secretRotationV2DAL.updateById(secretRotation.id, {
        rotationStatus: SecretRotationStatus.Failed,
        // rotationJobId: null, TODO
        lastRotationAttemptedAt: new Date(),
        encryptedLastRotationMessage: encryptedMessage
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
            occurredAt: updatedRotation.lastRotationAttemptedAt,
            status: SecretRotationStatus.Failed,
            message: errorMessage
            // todo: job Id and mapping
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
      subject(ProjectPermissionSub.SecretRotation, {
        environment: secretRotation.environment.slug,
        secretPath: secretRotation.folder.path
      })
    );

    if (secretRotation.connection.app !== SECRET_ROTATION_CONNECTION_MAP[type])
      throw new BadRequestError({
        message: `Secret sync with ID "${secretRotation.id}" is not configured for ${SECRET_ROTATION_NAME_MAP[type]}`
      });

    const updatedRotation = await rotateGeneratedCredentials(secretRotation);

    return updatedRotation;
  };

  const getDashboardSecretRotationCount = async (
    { projectId, environments, secretPath, search }: TGetDashboardSecretRotationV2Count,
    actor: OrgServiceActor
  ) => {
    const plan = await licenseService.getPlan(actor.orgId);

    // this is only used for dashboard so no need to throw
    if (!plan.secretRotation) return 0;

    const { permission } = await permissionService.getProjectPermission({
      actor: actor.type,
      actorId: actor.id,
      actorAuthMethod: actor.authMethod,
      actorOrgId: actor.orgId,
      actionProjectType: ActionProjectType.SecretManager,
      projectId
    });

    // dashboard only so just filtering out inacessible envs
    const permissiveEnvironments = environments.filter((environment) =>
      permission.can(
        ProjectPermissionSecretRotationActions.Read,
        subject(ProjectPermissionSub.SecretRotation, { environment, secretPath })
      )
    );

    const folders = await folderDAL.findBySecretPathMultiEnv(projectId, permissiveEnvironments, secretPath);

    if (!folders.length) {
      throw new NotFoundError({
        message: `Folders with path '${secretPath}' in environments with slugs '${permissiveEnvironments.join(
          ", "
        )}' not found`
      });
    }

    const count = await secretRotationV2DAL.findWithMappedSecretsCount({
      $in: { folderId: folders.map((folder) => folder.id) },
      search,
      projectId
    });

    return count;
  };

  const getDashboardSecretRotations = async (
    {
      projectId,
      environments,
      secretPath,
      search,
      limit,
      offset = 0,
      orderBy = SecretsOrderBy.Name,
      orderDirection = OrderByDirection.ASC
    }: TGetDashboardSecretRotationsV2,
    actor: OrgServiceActor
  ) => {
    const plan = await licenseService.getPlan(actor.orgId);

    // this is only used for dashboard so no need to throw
    if (!plan.secretRotation) return [];

    const { permission } = await permissionService.getProjectPermission({
      actor: actor.type,
      actorId: actor.id,
      actorAuthMethod: actor.authMethod,
      actorOrgId: actor.orgId,
      actionProjectType: ActionProjectType.SecretManager,
      projectId
    });

    // dashboard only so just filtering out inaccessible envs
    const permissiveEnvironments = environments.filter((environment) =>
      permission.can(
        ProjectPermissionSecretRotationActions.Read,
        subject(ProjectPermissionSub.SecretRotation, { environment, secretPath })
      )
    );

    const folders = await folderDAL.findBySecretPathMultiEnv(projectId, permissiveEnvironments, secretPath);

    if (!folders.length) {
      throw new NotFoundError({
        message: `Folders with path '${secretPath}' in environments with slugs '${permissiveEnvironments.join(
          ", "
        )}' not found`
      });
    }

    const folderIds = folders.map((folder) => folder.id);

    const secretRotations = await secretRotationV2DAL.findWithMappedSecrets(
      {
        $in: { folderId: folderIds },
        search,
        projectId
      },
      {
        limit,
        offset,
        sort: orderBy ? [[orderBy, orderDirection]] : undefined
      }
    );

    const personalSecrets = await secretV2BridgeDAL.find({
      $in: {
        folderId: folderIds,
        [`${TableName.SecretV2}.key` as "key"]: secretRotations.flatMap((rotation) =>
          rotation.secrets.map((secret) => secret.key)
        )
      },
      [`${TableName.SecretV2}.type` as "type"]: SecretType.Personal,
      [`${TableName.SecretV2}.userId` as "userId"]: actor.id
    });

    const personalMap = Object.fromEntries(
      personalSecrets.map((secret) => [secret.folderId, [] as typeof personalSecrets])
    );
    personalSecrets.forEach((secret) => personalMap[secret.folderId].push(secret));

    const modifiedSecretRotations = secretRotations.map((rotation) => {
      const rotationSecretKeys = rotation.secrets.map((secret) => secret.key);

      return {
        ...rotation,
        secrets: [
          ...rotation.secrets,
          ...(personalMap[rotation.folderId] ?? []).filter((secret) => rotationSecretKeys.includes(secret.key))
        ]
      };
    });

    const { decryptor: secretManagerDecryptor } = await kmsService.createCipherPairWithDataKey({
      type: KmsDataKey.SecretManager,
      projectId
    });

    const decryptedSecretRotations = modifiedSecretRotations.map(({ secrets, ...rotation }) => {
      const decryptedSecrets = secrets.map((secret) => {
        const canDescribeSecret = hasSecretReadValueOrDescribePermission(
          permission,
          ProjectPermissionSecretActions.DescribeSecret,
          {
            environment: rotation.environment.slug,
            secretPath: rotation.folder.path,
            secretName: secret.key,
            // TODO: scott/akhil our mapper seems to not propagate children's children types
            // @ts-expect-error eslint-disable-next-line @typescript-eslint/no-unsafe-call,@typescript-eslint/no-unsafe-assignment
            secretTags: (secret.tags as { slug: string; name: string; color: string }[]).map((i) => i.slug)
          }
        );

        if (!canDescribeSecret) {
          return null; // return null so we know to display empty row in dashboard
        }

        const secretValueHidden = !hasSecretReadValueOrDescribePermission(
          permission,
          ProjectPermissionSecretActions.ReadValue,
          {
            environment: rotation.environment.slug,
            secretPath: rotation.folder.path,
            secretName: secret.key,
            // TODO: scott/akhil our mapper seems to not propagate children's children types
            // @ts-expect-error eslint-disable-next-line @typescript-eslint/no-unsafe-call,@typescript-eslint/no-unsafe-assignment
            secretTags: (secret.tags as { slug: string; name: string; color: string }[]).map((i) => i.slug)
          }
        );

        return reshapeBridgeSecret(
          projectId,
          rotation.environment.slug,
          rotation.folder.path,
          {
            ...secret,
            value: secret.encryptedValue
              ? secretManagerDecryptor({ cipherTextBlob: secret.encryptedValue }).toString()
              : "",
            comment: secret.encryptedComment
              ? secretManagerDecryptor({ cipherTextBlob: secret.encryptedComment }).toString()
              : ""
          },
          secretValueHidden
        );
      });

      return {
        ...rotation,
        secrets: decryptedSecrets
      };
    });

    return decryptedSecretRotations as (TSecretRotationV2 & {
      secrets: Awaited<ReturnType<typeof reshapeBridgeSecret>>[];
    })[];
  };

  const getQuickSearchSecretRotations = async (
    { folderMappings, filters: { search, ...options }, projectId }: TQuickSearchSecretRotationsV2,
    actor: OrgServiceActor
  ) => {
    const { permission } = await permissionService.getProjectPermission({
      actor: actor.type,
      actorId: actor.id,
      projectId,
      actorAuthMethod: actor.authMethod,
      actorOrgId: actor.orgId,
      actionProjectType: ActionProjectType.SecretManager
    });

    const userAccessibleFolderMappings = folderMappings.filter(({ path, environment }) =>
      permission.can(
        ProjectPermissionSecretRotationActions.Read,
        subject(ProjectPermissionSub.SecretRotation, { environment, secretPath: path })
      )
    );

    const secretRotations = await secretRotationV2DAL.find(
      {
        projectId,
        $search: {
          name: `%${search}%`
        },
        $in: {
          folderId: userAccessibleFolderMappings.map(({ folderId }) => folderId)
        }
      },
      options
    );

    return secretRotations as TSecretRotationV2[];
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
    rotateGeneratedCredentials,
    getDashboardSecretRotationCount,
    getDashboardSecretRotations,
    getQuickSearchSecretRotations
  };
};
