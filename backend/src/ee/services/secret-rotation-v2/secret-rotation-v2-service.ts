import { ForbiddenError, subject } from "@casl/ability";
import isEqual from "lodash.isequal";

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
  expandSecretRotation,
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
  TRotationFactory,
  TSecretRotationV2,
  TSecretRotationV2Raw,
  TSecretRotationV2WithConnection,
  TUpdateSecretRotationV2DTO
} from "@app/ee/services/secret-rotation-v2/secret-rotation-v2-types";
import { sqlCredentialsRotationFactory } from "@app/ee/services/secret-rotation-v2/shared/sql-credentials";
import { TSecretSnapshotServiceFactory } from "@app/ee/services/secret-snapshot/secret-snapshot-service";
import { TKeyStoreFactory } from "@app/keystore/keystore";
import { DatabaseErrorCode } from "@app/lib/error-codes";
import { BadRequestError, DatabaseError, InternalServerError, NotFoundError } from "@app/lib/errors";
import { logger } from "@app/lib/logger";
import { OrderByDirection, OrgServiceActor } from "@app/lib/types";
import { decryptAppConnection } from "@app/services/app-connection/app-connection-fns";
import { TAppConnectionServiceFactory } from "@app/services/app-connection/app-connection-service";
import { ActorType } from "@app/services/auth/auth-type";
import { TKmsServiceFactory } from "@app/services/kms/kms-service";
import { KmsDataKey } from "@app/services/kms/kms-types";
import { TProjectBotServiceFactory } from "@app/services/project-bot/project-bot-service";
import { TResourceMetadataDALFactory } from "@app/services/resource-metadata/resource-metadata-dal";
import { TSecretQueueFactory } from "@app/services/secret/secret-queue";
import { SecretsOrderBy } from "@app/services/secret/secret-types";
import { TSecretFolderDALFactory } from "@app/services/secret-folder/secret-folder-dal";
import { TSecretTagDALFactory } from "@app/services/secret-tag/secret-tag-dal";
import { TSecretV2BridgeDALFactory } from "@app/services/secret-v2-bridge/secret-v2-bridge-dal";
import {
  fnSecretBulkDelete,
  fnSecretBulkInsert,
  fnSecretBulkUpdate,
  reshapeBridgeSecret
} from "@app/services/secret-v2-bridge/secret-v2-bridge-fns";
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
  folderDAL: Pick<TSecretFolderDALFactory, "findBySecretPath" | "findBySecretPathMultiEnv">;
  secretV2BridgeDAL: Pick<
    TSecretV2BridgeDALFactory,
    "bulkUpdate" | "insertMany" | "deleteMany" | "upsertSecretReferences" | "find"
  >;
  secretVersionV2BridgeDAL: Pick<TSecretVersionV2DALFactory, "insertMany">;
  secretVersionTagV2BridgeDAL: Pick<TSecretVersionV2TagDALFactory, "insertMany">;
  resourceMetadataDAL: Pick<TResourceMetadataDALFactory, "insertMany" | "delete">;
  secretTagDAL: Pick<TSecretTagDALFactory, "saveTagsToSecretV2" | "deleteTagsToSecretV2" | "find">;
  secretQueueService: Pick<TSecretQueueFactory, "syncSecrets" | "removeSecretReminder">;
  snapshotService: Pick<TSecretSnapshotServiceFactory, "performSnapshot">;
};

export type TSecretRotationV2ServiceFactory = ReturnType<typeof secretRotationV2ServiceFactory>;

const MAX_GENERATED_CREDENTIALS_LENGTH = 2;

const SECRET_ROTATION_FACTORY_MAP: Record<SecretRotation, TRotationFactory> = {
  [SecretRotation.PostgresCredentials]: sqlCredentialsRotationFactory,
  [SecretRotation.MsSqlCredentials]: sqlCredentialsRotationFactory
};

export const secretRotationV2ServiceFactory = ({
  secretRotationV2DAL,
  folderDAL,
  secretV2BridgeDAL,
  secretVersionV2BridgeDAL,
  secretVersionTagV2BridgeDAL,
  secretTagDAL,
  resourceMetadataDAL,
  permissionService,
  appConnectionService,
  projectBotService,
  licenseService,
  kmsService,
  auditLogService,
  secretQueueService,
  snapshotService
}: TSecretRotationV2ServiceFactoryDep) => {
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

    return Promise.all(
      secretRotations
        .filter((rotation) =>
          permission.can(
            ProjectPermissionSecretRotationActions.Read,
            subject(ProjectPermissionSub.SecretRotation, {
              environment: rotation.environment.slug,
              secretPath: rotation.folder.path
            })
          )
        )
        .map((rotation) => expandSecretRotation(rotation, kmsService))
    );
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

    return expandSecretRotation(secretRotation, kmsService);
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
      ProjectPermissionSecretRotationActions.ReadGeneratedCredentials,
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

    return expandSecretRotation(secretRotation, kmsService);
  };

  const createSecretRotation = async (
    {
      projectId,
      secretPath,
      environment,
      rotateAtUtc = { hours: 0, minutes: 0 },
      ...payload
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

    const folder = await folderDAL.findBySecretPath(projectId, environment, secretPath);

    if (!folder)
      throw new BadRequestError({
        message: `Could not find folder with path "${secretPath}" in environment "${environment}" for project with ID "${projectId}"`
      });

    const typeApp = SECRET_ROTATION_CONNECTION_MAP[payload.type];

    // validates permission to connect and app is valid for rotation type
    const appConnection = await appConnectionService.connectAppConnectionById(typeApp, payload.connectionId, actor);

    const rotationFactory = SECRET_ROTATION_FACTORY_MAP[payload.type]({
      parameters: payload.parameters,
      secretsMapping: payload.secretsMapping,
      connection: appConnection
    } as TSecretRotationV2WithConnection);

    try {
      const currentTime = new Date();

      const secretRotation = await rotationFactory.issueCredentials(async (newCredentials) => {
        const encryptedGeneratedCredentials = await encryptSecretRotationCredentials({
          generatedCredentials: [newCredentials],
          projectId,
          kmsService
        });

        return secretRotationV2DAL.transaction(async (tx) => {
          const createdRotation = await secretRotationV2DAL.create(
            {
              folderId: folder.id,
              ...payload,
              encryptedGeneratedCredentials,
              rotateAtUtc,
              rotationStatus: SecretRotationStatus.Success,
              lastRotationAttemptedAt: currentTime,
              lastRotatedAt: currentTime,
              isLastRotationManual: true
            },
            tx
          );

          const secretsPayload = rotationFactory.getSecretsPayload(newCredentials);

          const { encryptor } = await kmsService.createCipherPairWithDataKey({
            type: KmsDataKey.SecretManager,
            projectId
          });

          const mappedSecrets = await fnSecretBulkInsert({
            folderId: folder.id,
            orgId: appConnection.orgId,
            tx,
            inputSecrets: secretsPayload.map(({ key, value }) => ({
              key,
              encryptedValue: encryptor({
                plainText: Buffer.from(value)
              }).cipherTextBlob,
              references: []
            })),
            secretDAL: secretV2BridgeDAL,
            secretVersionDAL: secretVersionV2BridgeDAL,
            secretVersionTagDAL: secretVersionTagV2BridgeDAL,
            secretTagDAL,
            resourceMetadataDAL
          });

          await secretRotationV2DAL.insertSecretMappings(
            mappedSecrets.map((secret) => ({
              secretId: secret.id,
              rotationId: createdRotation.id
            })),
            tx
          );

          return createdRotation;
        });
      });

      await snapshotService.performSnapshot(folder.id);
      await secretQueueService.syncSecrets({
        orgId: appConnection.orgId,
        secretPath,
        projectId,
        environmentSlug: folder.environment.slug,
        excludeReplication: true
      });

      // TODO: verify credentials

      return await expandSecretRotation(secretRotation, kmsService);
    } catch (err) {
      if (err instanceof DatabaseError) {
        const error = err.error as { code: string; message: string; table: string };

        if (error.code === DatabaseErrorCode.UniqueViolation) {
          switch (error.table) {
            case TableName.SecretRotationV2:
              throw new BadRequestError({
                message: `A Secret Rotation with the name "${payload.name}" already exists at the secret path "${secretPath}"`
              });
            case TableName.SecretV2:
              throw new BadRequestError({
                message: `One or more of the following secrets already exists at the secret path "${secretPath}": ${Object.values(
                  payload.secretsMapping
                ).join(", ")}`
              });
            default:
              throw err;
          }
        }

        throw err;
      }

      throw new BadRequestError({ message: (err as Error).message });
    }
  };

  const updateSecretRotation = async (
    { type, rotationId, ...payload }: TUpdateSecretRotationV2DTO,
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

    const { folder, environment, projectId, folderId, connection, secretsMapping } = secretRotation;

    const { permission } = await permissionService.getProjectPermission({
      actor: actor.type,
      actorId: actor.id,
      actorAuthMethod: actor.authMethod,
      actorOrgId: actor.orgId,
      actionProjectType: ActionProjectType.SecretManager,
      projectId
    });

    ForbiddenError.from(permission).throwUnlessCan(
      ProjectPermissionSecretRotationActions.Edit,
      subject(ProjectPermissionSub.SecretRotation, {
        environment: environment.slug,
        secretPath: folder.path
      })
    );

    if (secretRotation.connection.app !== SECRET_ROTATION_CONNECTION_MAP[type])
      throw new BadRequestError({
        message: `Secret Rotation with ID "${secretRotation.id}" is not configured for ${SECRET_ROTATION_NAME_MAP[type]}`
      });

    try {
      const updatedSecretRotation = await secretRotationV2DAL.transaction(async (tx) => {
        if (payload.secretsMapping && !isEqual(payload.secretsMapping, secretsMapping)) {
          logger.warn({ secretsMapping, new: payload.secretsMapping }, `UPDATE MAPPINGS:`);
          // update mapped secrets names
          await fnSecretBulkUpdate({
            folderId,
            orgId: connection.orgId,
            tx,
            inputSecrets: Object.entries(secretsMapping as TSecretRotationV2["secretsMapping"]).map(
              ([mappingKey, secretKey]) => ({
                filter: {
                  key: secretKey,
                  folderId,
                  type: SecretType.Shared
                },
                data: {
                  key: payload.secretsMapping![mappingKey as keyof TSecretRotationV2["secretsMapping"]]
                }
              })
            ),
            secretDAL: secretV2BridgeDAL,
            secretVersionDAL: secretVersionV2BridgeDAL,
            secretVersionTagDAL: secretVersionTagV2BridgeDAL,
            secretTagDAL,
            resourceMetadataDAL
          });

          await snapshotService.performSnapshot(folder.id);
          await secretQueueService.syncSecrets({
            orgId: connection.orgId,
            secretPath: folder.path,
            projectId,
            environmentSlug: environment.slug,
            excludeReplication: true
          });
        }

        return secretRotationV2DAL.updateById(rotationId, payload, tx);
      });

      return await expandSecretRotation(updatedSecretRotation, kmsService);
    } catch (err) {
      if (err instanceof DatabaseError) {
        const error = err.error as { code: string; message: string; table: string };

        if (error.code === DatabaseErrorCode.UniqueViolation) {
          switch (error.table) {
            case TableName.SecretRotationV2:
              if (payload.name)
                throw new BadRequestError({
                  message: `A Secret Rotation with the name "${payload.name}" already exists at the secret path "${folder.path}"`
                });
            case TableName.SecretV2:
              if (payload.secretsMapping)
                throw new BadRequestError({
                  message: `One or more of the following secrets already exists at the secret path "${
                    folder.path
                  }": ${Object.values(payload.secretsMapping).join(", ")}`
                });
            default:
              throw err;
          }
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

    const { folder, environment, projectId, encryptedGeneratedCredentials, connection, folderId, secretsMapping } =
      secretRotation;

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
        message: `Secret Rotation with ID "${secretRotation.id}" is not configured for ${SECRET_ROTATION_NAME_MAP[type]}`
      });

    const deleteTransaction = secretRotationV2DAL.transaction(async (tx) => {
      if (deleteSecrets) {
        await fnSecretBulkDelete({
          secretDAL: secretV2BridgeDAL,
          secretQueueService,
          inputSecrets: Object.values(secretsMapping as TSecretRotationV2["secretsMapping"]).map((secretKey) => ({
            secretKey,
            type: SecretType.Shared
          })),
          projectId,
          folderId,
          actorId: actor.id, // not actually used since rotated secrets are shared
          tx
        });

        await snapshotService.performSnapshot(folder.id);
        await secretQueueService.syncSecrets({
          orgId: connection.orgId,
          secretPath: folder.path,
          projectId,
          environmentSlug: environment.slug,
          excludeReplication: true
        });
      }

      return secretRotationV2DAL.deleteById(rotationId, tx);
    });

    if (revokeGeneratedCredentials) {
      const appConnection = await decryptAppConnection(connection, kmsService);

      const rotationFactory = SECRET_ROTATION_FACTORY_MAP[type]({
        ...secretRotation,
        connection: appConnection
      } as TSecretRotationV2WithConnection);

      const generatedCredentials = await decryptSecretRotationCredentials({
        encryptedGeneratedCredentials,
        projectId,
        kmsService
      });

      await rotationFactory.revokeCredentials(generatedCredentials, async () => deleteTransaction);
    } else {
      await deleteTransaction;
    }

    return expandSecretRotation(secretRotation, kmsService);
  };

  const rotateGeneratedCredentials = async (
    secretRotation: TSecretRotationV2Raw,
    { auditLogInfo, jobId }: { auditLogInfo?: AuditLogInfo; jobId?: string }
  ) => {
    const { connection, folder, environment, encryptedGeneratedCredentials, activeIndex, projectId, type, folderId } =
      secretRotation;

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
        ...secretRotation,
        connection: appConnection
      } as TSecretRotationV2WithConnection);

      const updatedRotation = await rotationFactory.rotateCredentials(inactiveCredentials, async (newCredentials) => {
        const updatedCredentials = [...generatedCredentials];
        updatedCredentials[inactiveIndex] = newCredentials;

        const encryptedUpdatedCredentials = await encryptSecretRotationCredentials({
          projectId,
          generatedCredentials: updatedCredentials,
          kmsService
        });

        return secretRotationV2DAL.transaction(async (tx) => {
          const secretsPayload = rotationFactory.getSecretsPayload(newCredentials);

          const { encryptor } = await kmsService.createCipherPairWithDataKey({
            type: KmsDataKey.SecretManager,
            projectId
          });

          // update secret mappings with new credential values
          await fnSecretBulkUpdate({
            folderId,
            orgId: connection.orgId,
            tx,
            inputSecrets: secretsPayload.map(({ key, value }) => ({
              filter: {
                key,
                folderId,
                type: SecretType.Shared
              },
              data: {
                encryptedValue: encryptor({
                  plainText: Buffer.from(value)
                }).cipherTextBlob,
                references: []
              }
            })),
            secretDAL: secretV2BridgeDAL,
            secretVersionDAL: secretVersionV2BridgeDAL,
            secretVersionTagDAL: secretVersionTagV2BridgeDAL,
            secretTagDAL,
            resourceMetadataDAL
          });

          return secretRotationV2DAL.updateById(
            secretRotation.id,
            {
              encryptedGeneratedCredentials: encryptedUpdatedCredentials,
              activeIndex: inactiveIndex,
              lastRotatedAt: new Date(),
              lastRotationAttemptedAt: new Date(),
              isLastRotationManual: Boolean(auditLogInfo),
              rotationStatus: SecretRotationStatus.Success,
              lastRotationJobId: jobId,
              encryptedLastRotationMessage: null
            },
            tx
          );
        });
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
          type: EventType.SECRET_ROTATION_ROTATE_SECRETS,
          metadata: {
            type: updatedRotation.type,
            rotationId: updatedRotation.id,
            connectionId: updatedRotation.connectionId,
            folderId: updatedRotation.folderId,
            parameters: updatedRotation.parameters,
            secretsMapping: updatedRotation.secretsMapping,
            status: SecretRotationStatus.Success,
            occurredAt: new Date(),
            message: null,
            jobId
          }
        }
      });

      await snapshotService.performSnapshot(folder.id);
      await secretQueueService.syncSecrets({
        orgId: connection.orgId,
        secretPath: folder.path,
        projectId,
        environmentSlug: environment.slug,
        excludeReplication: true
      });

      return updatedRotation;
    } catch (error) {
      const errorMessage = parseRotationErrorMessage(error);

      const { encryptor } = await kmsService.createCipherPairWithDataKey({
        type: KmsDataKey.SecretManager,
        projectId
      });

      const { cipherTextBlob: encryptedMessage } = encryptor({
        plainText: Buffer.from(errorMessage)
      });

      const updatedRotation = await secretRotationV2DAL.updateById(secretRotation.id, {
        rotationStatus: SecretRotationStatus.Failed,
        lastRotationJobId: jobId,
        lastRotationAttemptedAt: new Date(),
        encryptedLastRotationMessage: encryptedMessage
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
          type: EventType.SECRET_ROTATION_ROTATE_SECRETS,
          metadata: {
            type: updatedRotation.type,
            rotationId: updatedRotation.id,
            connectionId: updatedRotation.connectionId,
            folderId: updatedRotation.folderId,
            parameters: updatedRotation.parameters,
            secretsMapping: updatedRotation.secretsMapping,
            occurredAt: new Date(),
            status: SecretRotationStatus.Failed,
            message: "See Rotation status for details",
            jobId
          }
        }
      });

      throw error;
    }
  };

  const rotateSecretRotation = async (
    { rotationId, type, auditLogInfo }: TRotateSecretRotationV2,
    actor: OrgServiceActor
  ) => {
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
      ProjectPermissionSecretRotationActions.RotateSecrets,
      subject(ProjectPermissionSub.SecretRotation, {
        environment: secretRotation.environment.slug,
        secretPath: secretRotation.folder.path
      })
    );

    if (secretRotation.connection.app !== SECRET_ROTATION_CONNECTION_MAP[type])
      throw new BadRequestError({
        message: `Secret Rotation with ID "${secretRotation.id}" is not configured for ${SECRET_ROTATION_NAME_MAP[type]}`
      });

    try {
      const updatedRotation = await rotateGeneratedCredentials(secretRotation, { auditLogInfo });

      return await expandSecretRotation(updatedRotation, kmsService);
    } catch (err) {
      throw new InternalServerError({
        message: (err as Error).message ?? "Failed to rotate secrets: check Rotation status for details."
      });
    }
  };

  const getDashboardSecretRotationCount = async (
    { projectId, environments, secretPath, search }: TGetDashboardSecretRotationV2Count,
    actor: OrgServiceActor
  ) => {
    // we don't check plan for dashboard like dynamic secret, actions will be prevented

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

    if (!permissiveEnvironments.length) return 0;

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
    // we don't check plan for dashboard like dynamic secret, actions will be prevented

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

    if (!permissiveEnvironments.length) return [];

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

    const modifiedSecretRotations = await Promise.all(
      secretRotations.map(async (rotation) => {
        const rotationSecretKeys = rotation.secrets.map((secret) => secret.key);

        const decryptedRotation = await expandSecretRotation(rotation, kmsService);

        return {
          ...decryptedRotation,
          secrets: [
            ...rotation.secrets,
            ...(personalMap[rotation.folderId] ?? []).filter((secret) => rotationSecretKeys.includes(secret.key))
          ]
        };
      })
    );

    const { decryptor: secretManagerDecryptor } = await kmsService.createCipherPairWithDataKey({
      type: KmsDataKey.SecretManager,
      projectId
    });

    const secretRotationsWithSecrets = modifiedSecretRotations.map(({ secrets, ...rotation }) => {
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

    return secretRotationsWithSecrets as (TSecretRotationV2 & {
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

    const permissiveFolderMappings = folderMappings.filter(({ path, environment }) =>
      permission.can(
        ProjectPermissionSecretRotationActions.Read,
        subject(ProjectPermissionSub.SecretRotation, { environment, secretPath: path })
      )
    );

    if (!permissiveFolderMappings.length) return [];

    const secretRotations = await secretRotationV2DAL.find(
      {
        projectId,
        $search: {
          name: `%${search}%`
        },
        $in: {
          folderId: permissiveFolderMappings.map(({ folderId }) => folderId)
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
