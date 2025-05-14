import { ForbiddenError, subject } from "@casl/ability";

import { ActionProjectType, TableName } from "@app/db/schemas";
import { TAuditLogServiceFactory } from "@app/ee/services/audit-log/audit-log-service";
import { TLicenseServiceFactory } from "@app/ee/services/license/license-service";
import { TPermissionServiceFactory } from "@app/ee/services/permission/permission-service";
import {
  ProjectPermissionSecretRotationActions,
  ProjectPermissionSub
} from "@app/ee/services/permission/project-permission";
import { SecretRotationStatus } from "@app/ee/services/secret-rotation-v2/secret-rotation-v2-enums";
import {
  calculateNextRotationAt,
  encryptSecretRotationCredentials,
  expandSecretRotation,
  listSecretRotationOptions,
  parseRotationErrorMessage
} from "@app/ee/services/secret-rotation-v2/secret-rotation-v2-fns";
import { SECRET_ROTATION_CONNECTION_MAP } from "@app/ee/services/secret-rotation-v2/secret-rotation-v2-maps";
import {
  TCreateSecretRotationV2DTO,
  TSecretRotationV2GeneratedCredentials,
  TSecretRotationV2Raw,
  TSecretRotationV2WithConnection
} from "@app/ee/services/secret-rotation-v2/secret-rotation-v2-types";
import { PgSqlLock, TKeyStoreFactory } from "@app/keystore/keystore";
import { getConfig } from "@app/lib/config/env";
import { DatabaseErrorCode } from "@app/lib/error-codes";
import { BadRequestError, DatabaseError } from "@app/lib/errors";
import { OrgServiceActor } from "@app/lib/types";
import { QueueJobs, TQueueServiceFactory } from "@app/queue";
import { TAppConnectionDALFactory } from "@app/services/app-connection/app-connection-dal";
import { TAppConnectionServiceFactory } from "@app/services/app-connection/app-connection-service";
import { KmsDataKey } from "@app/services/kms/kms-types";
import { fnSecretBulkInsert } from "@app/services/secret-v2-bridge/secret-v2-bridge-fns";

import { TSecretScanningV2DALFactory } from "./secret-scanning-v2-dal";

export type TSecretRotationV2ServiceFactoryDep = {
  secretScanningV2DAL: TSecretScanningV2DALFactory;
  appConnectionService: Pick<TAppConnectionServiceFactory, "connectAppConnectionById">;
  permissionService: Pick<TPermissionServiceFactory, "getProjectPermission" | "getOrgPermission">;
  licenseService: Pick<TLicenseServiceFactory, "getPlan">;
  auditLogService: Pick<TAuditLogServiceFactory, "createAuditLog">;
  keyStore: Pick<TKeyStoreFactory, "acquireLock" | "setItemWithExpiry" | "getItem">;
  queueService: Pick<TQueueServiceFactory, "queuePg">;
  appConnectionDAL: Pick<TAppConnectionDALFactory, "findById" | "update" | "updateById">;
};

export type TSecretScanningV2ServiceFactory = ReturnType<typeof secretRotationV2ServiceFactory>;

export const secretRotationV2ServiceFactory = ({
  secretScanningV2DAL,
  permissionService,
  appConnectionService,
  licenseService,
  auditLogService,
  keyStore,
  queueService,
  appConnectionDAL
}: TSecretRotationV2ServiceFactoryDep) => {
  const $queueSendSecretRotationStatusNotification = async (secretRotation: TSecretRotationV2Raw) => {
    const appCfg = getConfig();
    if (!appCfg.isSmtpConfigured) return; // comment out if testing email sending

    await queueService.queuePg(
      QueueJobs.SecretRotationV2SendNotification,
      { secretRotation },
      {
        jobId: `secret-rotation-v2-notification-${secretRotation.id}`,
        retryLimit: 5,
        retryBackoff: true
      }
    );
  };

  // const listSecretRotationsByProjectId = async (
  //   { projectId, type }: TListSecretRotationsV2ByProjectId,
  //   actor: OrgServiceActor
  // ) => {
  //   const plan = await licenseService.getPlan(actor.orgId);
  //
  //   if (!plan.secretRotation)
  //     throw new BadRequestError({
  //       message: "Failed to access secret rotations due to plan restriction. Upgrade plan to access secret rotations."
  //     });
  //
  //   const { permission } = await permissionService.getProjectPermission({
  //     actor: actor.type,
  //     actorId: actor.id,
  //     actorAuthMethod: actor.authMethod,
  //     actorOrgId: actor.orgId,
  //     actionProjectType: ActionProjectType.SecretManager,
  //     projectId
  //   });
  //
  //   ForbiddenError.from(permission).throwUnlessCan(
  //     ProjectPermissionSecretRotationActions.Read,
  //     ProjectPermissionSub.SecretRotation
  //   );
  //
  //   const secretRotations = await secretRotationV2DAL.find({
  //     ...(type && { type }),
  //     projectId
  //   });
  //
  //   return Promise.all(
  //     secretRotations
  //       .filter((rotation) =>
  //         permission.can(
  //           ProjectPermissionSecretRotationActions.Read,
  //           subject(ProjectPermissionSub.SecretRotation, {
  //             environment: rotation.environment.slug,
  //             secretPath: rotation.folder.path
  //           })
  //         )
  //       )
  //       .map((rotation) => expandSecretRotation(rotation, kmsService))
  //   );
  // };

  // const findSecretRotationById = async ({ type, rotationId }: TFindSecretRotationV2ByIdDTO, actor: OrgServiceActor) => {
  //   const plan = await licenseService.getPlan(actor.orgId);
  //
  //   if (!plan.secretRotation)
  //     throw new BadRequestError({
  //       message: "Failed to access secret rotation due to plan restriction. Upgrade plan to access secret rotations."
  //     });
  //
  //   const secretRotation = await secretRotationV2DAL.findById(rotationId);
  //
  //   if (!secretRotation)
  //     throw new NotFoundError({
  //       message: `Could not find ${SECRET_ROTATION_NAME_MAP[type]} Rotation with ID "${rotationId}"`
  //     });
  //
  //   const { projectId, environment, folder, connection } = secretRotation;
  //
  //   const { permission } = await permissionService.getProjectPermission({
  //     actor: actor.type,
  //     actorId: actor.id,
  //     actorAuthMethod: actor.authMethod,
  //     actorOrgId: actor.orgId,
  //     actionProjectType: ActionProjectType.SecretManager,
  //     projectId
  //   });
  //
  //   ForbiddenError.from(permission).throwUnlessCan(
  //     ProjectPermissionSecretRotationActions.Read,
  //     subject(ProjectPermissionSub.SecretRotation, {
  //       environment: environment.slug,
  //       secretPath: folder.path
  //     })
  //   );
  //
  //   if (connection.app !== SECRET_ROTATION_CONNECTION_MAP[type])
  //     throw new BadRequestError({
  //       message: `Secret Rotation with ID "${rotationId}" is not configured for ${SECRET_ROTATION_NAME_MAP[type]}`
  //     });
  //
  //   return expandSecretRotation(secretRotation, kmsService);
  // };

  // const findSecretRotationGeneratedCredentialsById = async (
  //   { type, rotationId }: TFindSecretRotationV2ByIdDTO,
  //   actor: OrgServiceActor
  // ) => {
  //   const plan = await licenseService.getPlan(actor.orgId);
  //
  //   if (!plan.secretRotation)
  //     throw new BadRequestError({
  //       message:
  //         "Failed to access secret rotation credentials due to plan restriction. Upgrade plan to access secret rotations credentials."
  //     });
  //
  //   const secretRotation = await secretRotationV2DAL.findById(rotationId);
  //
  //   if (!secretRotation)
  //     throw new NotFoundError({
  //       message: `Could not find ${SECRET_ROTATION_NAME_MAP[type]} Rotation with ID "${rotationId}"`
  //     });
  //
  //   const { projectId, environment, folder, connection, encryptedGeneratedCredentials } = secretRotation;
  //
  //   const { permission } = await permissionService.getProjectPermission({
  //     actor: actor.type,
  //     actorId: actor.id,
  //     actorAuthMethod: actor.authMethod,
  //     actorOrgId: actor.orgId,
  //     actionProjectType: ActionProjectType.SecretManager,
  //     projectId
  //   });
  //
  //   ForbiddenError.from(permission).throwUnlessCan(
  //     ProjectPermissionSecretRotationActions.ReadGeneratedCredentials,
  //     subject(ProjectPermissionSub.SecretRotation, {
  //       environment: environment.slug,
  //       secretPath: folder.path
  //     })
  //   );
  //
  //   if (connection.app !== SECRET_ROTATION_CONNECTION_MAP[type])
  //     throw new BadRequestError({
  //       message: `Secret Rotation with ID "${rotationId}" is not configured for ${SECRET_ROTATION_NAME_MAP[type]}`
  //     });
  //
  //   const generatedCredentials = await decryptSecretRotationCredentials({
  //     projectId,
  //     encryptedGeneratedCredentials,
  //     kmsService
  //   });
  //
  //   return {
  //     generatedCredentials,
  //     secretRotation: secretRotation as TSecretRotationV2
  //   };
  // };

  // const findSecretRotationByName = async (
  //   { type, rotationName, secretPath, environment, projectId }: TFindSecretRotationV2ByNameDTO,
  //   actor: OrgServiceActor
  // ) => {
  //   const plan = await licenseService.getPlan(actor.orgId);
  //
  //   if (!plan.secretRotation)
  //     throw new BadRequestError({
  //       message: "Failed to access secret rotation due to plan restriction. Upgrade plan to access secret rotations."
  //     });
  //
  //   const folder = await folderDAL.findBySecretPath(projectId, environment, secretPath);
  //
  //   if (!folder)
  //     throw new BadRequestError({
  //       message: `Could not find folder with path "${secretPath}" in environment "${environment}" for project with ID "${projectId}"`
  //     });
  //
  //   // we prevent conflicting names within a folder
  //   const secretRotation = await secretRotationV2DAL.findOne({
  //     name: rotationName,
  //     folderId: folder.id
  //   });
  //
  //   if (!secretRotation)
  //     throw new NotFoundError({
  //       message: `Could not find ${SECRET_ROTATION_NAME_MAP[type]} Rotation with name "${rotationName}"`
  //     });
  //
  //   const { connection, id: rotationId } = secretRotation;
  //
  //   const { permission } = await permissionService.getProjectPermission({
  //     actor: actor.type,
  //     actorId: actor.id,
  //     actorAuthMethod: actor.authMethod,
  //     actorOrgId: actor.orgId,
  //     actionProjectType: ActionProjectType.SecretManager,
  //     projectId
  //   });
  //
  //   ForbiddenError.from(permission).throwUnlessCan(
  //     ProjectPermissionSecretRotationActions.Read,
  //     subject(ProjectPermissionSub.SecretRotation, {
  //       environment,
  //       secretPath
  //     })
  //   );
  //
  //   if (connection.app !== SECRET_ROTATION_CONNECTION_MAP[type])
  //     throw new BadRequestError({
  //       message: `Secret Rotation with ID "${rotationId}" is not configured for ${SECRET_ROTATION_NAME_MAP[type]}`
  //     });
  //
  //   return expandSecretRotation(secretRotation, kmsService);
  // };

  const createSecretScanningSource = async (
    {
      projectId,
      secretPath,
      environment,
      rotateAtUtc = { hours: 0, minutes: 0 },
      secretsMapping,
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
      throw new BadRequestError({
        message:
          "Project version does not support Secret Rotation V2. Please upgrade your project via the Infiscal Dashboard to gain access."
      });

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
    const connection = await appConnectionService.connectAppConnectionById(typeApp, payload.connectionId, actor);

    const rotationFactory = SECRET_ROTATION_FACTORY_MAP[payload.type](
      {
        parameters: payload.parameters,
        secretsMapping,
        connection,
        rotationInterval: payload.rotationInterval
      } as TSecretRotationV2WithConnection,
      appConnectionDAL,
      kmsService
    );

    // even though we have a db constraint we want to check before any rotation of credentials is attempted
    // to prevent creation failure after external credentials have been modified
    const conflictingRotation = await secretRotationV2DAL.findOne({
      name: payload.name,
      folderId: folder.id
    });

    if (conflictingRotation)
      throw new BadRequestError({
        message: `A Secret Rotation with the name "${payload.name}" already exists at the secret path "${secretPath}"`
      });

    try {
      const currentTime = new Date();

      // callback structure to support transactional rollback when possible
      const secretRotation = await rotationFactory.issueCredentials(async (newCredentials) => {
        const encryptedGeneratedCredentials = await encryptSecretRotationCredentials({
          generatedCredentials: [newCredentials] as TSecretRotationV2GeneratedCredentials,
          projectId,
          kmsService
        });

        return secretRotationV2DAL.transaction(async (tx) => {
          await tx.raw("SELECT pg_advisory_xact_lock(?)", [PgSqlLock.SecretRotationV2Creation(folder.id)]);

          await $throwOnConflictingSecrets({
            secretPath,
            secretKeys: Object.values(secretsMapping),
            tx,
            folderId: folder.id
          });

          const createdRotation = await secretRotationV2DAL.create(
            {
              folderId: folder.id,
              secretsMapping,
              ...payload,
              encryptedGeneratedCredentials,
              rotateAtUtc,
              rotationStatus: SecretRotationStatus.Success,
              lastRotationAttemptedAt: currentTime,
              lastRotatedAt: currentTime,
              nextRotationAt: calculateNextRotationAt({
                lastRotatedAt: currentTime,
                isAutoRotationEnabled: Boolean(payload.isAutoRotationEnabled),
                rotateAtUtc,
                rotationInterval: payload.rotationInterval,
                rotationStatus: SecretRotationStatus.Success,
                isManualRotation: true
              })
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
            orgId: connection.orgId,
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

      await secretV2BridgeDAL.invalidateSecretCacheByProjectId(projectId);
      await snapshotService.performSnapshot(folder.id);
      await secretQueueService.syncSecrets({
        orgId: connection.orgId,
        secretPath,
        projectId,
        environmentSlug: environment,
        excludeReplication: true
      });

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
            default:
              throw err;
          }
        }

        throw err;
      }

      if (err instanceof BadRequestError) throw err;

      throw new BadRequestError({
        message: parseRotationErrorMessage(err)
      });
    }
  };

  // const updateSecretRotation = async (
  //   { type, rotationId, ...payload }: TUpdateSecretRotationV2DTO,
  //   actor: OrgServiceActor
  // ) => {
  //   const plan = await licenseService.getPlan(actor.orgId);
  //
  //   if (!plan.secretRotation)
  //     throw new BadRequestError({
  //       message: "Failed to update secret rotation due to plan restriction. Upgrade plan to update secret rotations."
  //     });
  //
  //   const secretRotation = await secretRotationV2DAL.findById(rotationId);
  //
  //   if (!secretRotation)
  //     throw new NotFoundError({
  //       message: `Could not find ${SECRET_ROTATION_NAME_MAP[type]} Rotation with ID ${rotationId}`
  //     });
  //
  //   const { folder, environment, projectId, folderId, connection } = secretRotation;
  //   const secretsMapping = secretRotation.secretsMapping as TSecretRotationV2["secretsMapping"];
  //
  //   const { permission } = await permissionService.getProjectPermission({
  //     actor: actor.type,
  //     actorId: actor.id,
  //     actorAuthMethod: actor.authMethod,
  //     actorOrgId: actor.orgId,
  //     actionProjectType: ActionProjectType.SecretManager,
  //     projectId
  //   });
  //
  //   ForbiddenError.from(permission).throwUnlessCan(
  //     ProjectPermissionSecretRotationActions.Edit,
  //     subject(ProjectPermissionSub.SecretRotation, {
  //       environment: environment.slug,
  //       secretPath: folder.path
  //     })
  //   );
  //
  //   if (connection.app !== SECRET_ROTATION_CONNECTION_MAP[type])
  //     throw new BadRequestError({
  //       message: `Secret Rotation with ID "${rotationId}" is not configured for ${SECRET_ROTATION_NAME_MAP[type]}`
  //     });
  //
  //   const nextRotationAt = calculateNextRotationAt({
  //     ...(secretRotation as TSecretRotationV2),
  //     ...payload,
  //     isManualRotation: secretRotation.isLastRotationManual
  //   });
  //
  //   let secretsMappingUpdated = false;
  //
  //   try {
  //     const updatedSecretRotation = await secretRotationV2DAL.transaction(async (tx) => {
  //       await tx.raw("SELECT pg_advisory_xact_lock(?)", [PgSqlLock.SecretRotationV2Creation(folder.id)]);
  //
  //       if (payload.secretsMapping && !isEqual(payload.secretsMapping, secretsMapping)) {
  //         const currentMappingKeys = Object.values(secretsMapping);
  //         await $throwOnConflictingSecrets({
  //           secretPath: folder.path,
  //           secretKeys: Object.values(payload.secretsMapping).filter((key) => !currentMappingKeys.includes(key)),
  //           tx,
  //           folderId: folder.id
  //         });
  //
  //         // update mapped secrets names
  //         await fnSecretBulkUpdate({
  //           folderId,
  //           orgId: connection.orgId,
  //           tx,
  //           inputSecrets: Object.entries(secretsMapping).map(([mappingKey, secretKey]) => ({
  //             filter: {
  //               key: secretKey,
  //               folderId,
  //               type: SecretType.Shared
  //             },
  //             data: {
  //               key: payload.secretsMapping![mappingKey as keyof TSecretRotationV2["secretsMapping"]]
  //             }
  //           })),
  //           secretDAL: secretV2BridgeDAL,
  //           secretVersionDAL: secretVersionV2BridgeDAL,
  //           secretVersionTagDAL: secretVersionTagV2BridgeDAL,
  //           secretTagDAL,
  //           resourceMetadataDAL
  //         });
  //
  //         secretsMappingUpdated = true;
  //       }
  //
  //       return secretRotationV2DAL.updateById(
  //         rotationId,
  //         {
  //           ...payload,
  //           nextRotationAt
  //         },
  //         tx
  //       );
  //     });
  //
  //     if (secretsMappingUpdated) {
  //       await secretV2BridgeDAL.invalidateSecretCacheByProjectId(projectId);
  //       await snapshotService.performSnapshot(folder.id);
  //       await secretQueueService.syncSecrets({
  //         orgId: connection.orgId,
  //         secretPath: folder.path,
  //         projectId,
  //         environmentSlug: environment.slug,
  //         excludeReplication: true
  //       });
  //     }
  //
  //     // queue for rotation if adjusted time falls before next cron
  //     if (nextRotationAt && nextRotationAt.getTime() < getNextUtcRotationInterval().getTime()) {
  //       await queueService.queuePg(
  //         QueueJobs.SecretRotationV2RotateSecrets,
  //         { rotationId, queuedAt: new Date(), isManualRotation: true },
  //         getSecretRotationRotateSecretJobOptions(updatedSecretRotation)
  //       );
  //     }
  //
  //     return await expandSecretRotation(updatedSecretRotation, kmsService);
  //   } catch (err) {
  //     if (err instanceof DatabaseError) {
  //       const error = err.error as { code: string; message: string; table: string };
  //
  //       if (error.code === DatabaseErrorCode.UniqueViolation) {
  //         switch (error.table) {
  //           case TableName.SecretRotationV2:
  //             if (payload.name)
  //               throw new BadRequestError({
  //                 message: `A Secret Rotation with the name "${payload.name}" already exists at the secret path "${folder.path}"`
  //               });
  //             break;
  //           default:
  //             throw err;
  //         }
  //       }
  //     }
  //
  //     if (err instanceof BadRequestError) throw err;
  //
  //     throw err;
  //   }
  // };

  // const deleteSecretRotation = async (
  //   { type, rotationId, deleteSecrets, revokeGeneratedCredentials }: TDeleteSecretRotationV2DTO,
  //   actor: OrgServiceActor
  // ) => {
  //   const plan = await licenseService.getPlan(actor.orgId);
  //
  //   if (!plan.secretRotation)
  //     throw new BadRequestError({
  //       message: "Failed to delete secret rotation due to plan restriction. Upgrade plan to delete secret rotation."
  //     });
  //
  //   const secretRotation = await secretRotationV2DAL.findById(rotationId);
  //
  //   if (!secretRotation)
  //     throw new NotFoundError({
  //       message: `Could not find ${SECRET_ROTATION_NAME_MAP[type]} Rotation with ID "${rotationId}"`
  //     });
  //
  //   const { folder, environment, projectId, encryptedGeneratedCredentials, connection, folderId, secretsMapping } =
  //     secretRotation;
  //
  //   const { permission } = await permissionService.getProjectPermission({
  //     actor: actor.type,
  //     actorId: actor.id,
  //     actorAuthMethod: actor.authMethod,
  //     actorOrgId: actor.orgId,
  //     actionProjectType: ActionProjectType.SecretManager,
  //     projectId
  //   });
  //
  //   ForbiddenError.from(permission).throwUnlessCan(
  //     ProjectPermissionSecretRotationActions.Delete,
  //     subject(ProjectPermissionSub.SecretRotation, {
  //       environment: environment.slug,
  //       secretPath: folder.path
  //     })
  //   );
  //
  //   if (connection.app !== SECRET_ROTATION_CONNECTION_MAP[type])
  //     throw new BadRequestError({
  //       message: `Secret Rotation with ID "${rotationId}" is not configured for ${SECRET_ROTATION_NAME_MAP[type]}`
  //     });
  //
  //   const deleteTransaction = async () =>
  //     secretRotationV2DAL.transaction(async (tx) => {
  //       if (deleteSecrets) {
  //         await fnSecretBulkDelete({
  //           secretDAL: secretV2BridgeDAL,
  //           secretQueueService,
  //           inputSecrets: Object.values(secretsMapping as TSecretRotationV2["secretsMapping"]).map((secretKey) => ({
  //             secretKey,
  //             type: SecretType.Shared
  //           })),
  //           projectId,
  //           folderId,
  //           actorId: actor.id, // not actually used since rotated secrets are shared
  //           tx
  //         });
  //       }
  //
  //       return secretRotationV2DAL.deleteById(rotationId, tx);
  //     });
  //
  //   if (revokeGeneratedCredentials) {
  //     const appConnection = await decryptAppConnection(connection, kmsService);
  //
  //     const rotationFactory = SECRET_ROTATION_FACTORY_MAP[type](
  //       {
  //         ...secretRotation,
  //         connection: appConnection
  //       } as TSecretRotationV2WithConnection,
  //       appConnectionDAL,
  //       kmsService
  //     );
  //
  //     const generatedCredentials = await decryptSecretRotationCredentials({
  //       encryptedGeneratedCredentials,
  //       projectId,
  //       kmsService
  //     });
  //
  //     await rotationFactory.revokeCredentials(generatedCredentials, deleteTransaction);
  //   } else {
  //     await deleteTransaction();
  //   }
  //
  //   if (deleteSecrets) {
  //     await secretV2BridgeDAL.invalidateSecretCacheByProjectId(projectId);
  //     await snapshotService.performSnapshot(folder.id);
  //     await secretQueueService.syncSecrets({
  //       orgId: connection.orgId,
  //       secretPath: folder.path,
  //       projectId,
  //       environmentSlug: environment.slug,
  //       excludeReplication: true
  //     });
  //   }
  //
  //   return expandSecretRotation(secretRotation, kmsService);
  // };

  // const rotateGeneratedCredentials = async (
  //   secretRotation: TSecretRotationV2Raw,
  //   {
  //     auditLogInfo,
  //     jobId,
  //     shouldSendNotification,
  //     isFinalAttempt = true,
  //     isManualRotation = false
  //   }: TSecretRotationRotateGeneratedCredentials = {}
  // ) => {
  //   const {
  //     connection,
  //     folder,
  //     environment,
  //     encryptedGeneratedCredentials,
  //     activeIndex,
  //     projectId,
  //     type,
  //     folderId,
  //     id: rotationId,
  //     parameters,
  //     secretsMapping
  //   } = secretRotation;
  //
  //   let lock: Awaited<ReturnType<typeof keyStore.acquireLock>> | undefined;
  //
  //   try {
  //     try {
  //       lock = await keyStore.acquireLock([KeyStorePrefixes.SecretRotationLock(rotationId)], 60 * 1000);
  //     } catch (e) {
  //       throw new InternalServerError({
  //         message: "Failed to acquire rotation lock."
  //       });
  //     }
  //
  //     const appConnection = await decryptAppConnection(connection, kmsService);
  //
  //     const generatedCredentials = await decryptSecretRotationCredentials({
  //       projectId,
  //       encryptedGeneratedCredentials,
  //       kmsService
  //     });
  //
  //     const inactiveIndex = (activeIndex + 1) % MAX_GENERATED_CREDENTIALS_LENGTH;
  //
  //     const inactiveCredentials = generatedCredentials[inactiveIndex];
  //
  //     const rotationFactory = SECRET_ROTATION_FACTORY_MAP[type as SecretRotation](
  //       {
  //         ...secretRotation,
  //         connection: appConnection
  //       } as TSecretRotationV2WithConnection,
  //       appConnectionDAL,
  //       kmsService
  //     );
  //
  //     const updatedRotation = await rotationFactory.rotateCredentials(inactiveCredentials, async (newCredentials) => {
  //       const updatedCredentials = [...generatedCredentials];
  //       updatedCredentials[inactiveIndex] = newCredentials;
  //
  //       const encryptedUpdatedCredentials = await encryptSecretRotationCredentials({
  //         projectId,
  //         generatedCredentials: updatedCredentials as TSecretRotationV2GeneratedCredentials,
  //         kmsService
  //       });
  //
  //       return secretRotationV2DAL.transaction(async (tx) => {
  //         const secretsPayload = rotationFactory.getSecretsPayload(newCredentials);
  //
  //         const { encryptor } = await kmsService.createCipherPairWithDataKey({
  //           type: KmsDataKey.SecretManager,
  //           projectId
  //         });
  //
  //         // update mapped secrets with new credential values
  //         await fnSecretBulkUpdate({
  //           folderId,
  //           orgId: connection.orgId,
  //           tx,
  //           inputSecrets: secretsPayload.map(({ key, value }) => ({
  //             filter: {
  //               key,
  //               folderId,
  //               type: SecretType.Shared
  //             },
  //             data: {
  //               encryptedValue: encryptor({
  //                 plainText: Buffer.from(value)
  //               }).cipherTextBlob,
  //               references: []
  //             }
  //           })),
  //           secretDAL: secretV2BridgeDAL,
  //           secretVersionDAL: secretVersionV2BridgeDAL,
  //           secretVersionTagDAL: secretVersionTagV2BridgeDAL,
  //           secretTagDAL,
  //           resourceMetadataDAL
  //         });
  //
  //         const currentTime = new Date();
  //
  //         return secretRotationV2DAL.updateById(
  //           secretRotation.id,
  //           {
  //             encryptedGeneratedCredentials: encryptedUpdatedCredentials,
  //             activeIndex: inactiveIndex,
  //             isLastRotationManual: isManualRotation,
  //             lastRotatedAt: currentTime,
  //             lastRotationAttemptedAt: currentTime,
  //             nextRotationAt: calculateNextRotationAt({
  //               ...(secretRotation as TSecretRotationV2),
  //               rotationStatus: SecretRotationStatus.Success,
  //               lastRotatedAt: currentTime,
  //               isManualRotation
  //             }),
  //             rotationStatus: SecretRotationStatus.Success,
  //             lastRotationJobId: jobId,
  //             encryptedLastRotationMessage: null
  //           },
  //           tx
  //         );
  //       });
  //     });
  //
  //     await auditLogService.createAuditLog({
  //       ...(auditLogInfo ?? {
  //         actor: {
  //           type: ActorType.PLATFORM,
  //           metadata: {}
  //         }
  //       }),
  //       projectId,
  //       event: {
  //         type: EventType.SECRET_ROTATION_ROTATE_SECRETS,
  //         metadata: {
  //           type,
  //           rotationId,
  //           connectionId: connection.id,
  //           folderId,
  //           parameters,
  //           secretsMapping,
  //           status: SecretRotationStatus.Success,
  //           occurredAt: new Date(),
  //           message: null,
  //           jobId
  //         }
  //       }
  //     });
  //
  //     await secretV2BridgeDAL.invalidateSecretCacheByProjectId(projectId);
  //     await snapshotService.performSnapshot(folder.id);
  //     await secretQueueService.syncSecrets({
  //       orgId: connection.orgId,
  //       secretPath: folder.path,
  //       projectId,
  //       environmentSlug: environment.slug,
  //       excludeReplication: true
  //     });
  //
  //     return updatedRotation;
  //   } catch (error) {
  //     const errorMessage = parseRotationErrorMessage(error);
  //
  //     if (isFinalAttempt) {
  //       const { encryptor } = await kmsService.createCipherPairWithDataKey({
  //         type: KmsDataKey.SecretManager,
  //         projectId
  //       });
  //
  //       const { cipherTextBlob: encryptedMessage } = encryptor({
  //         plainText: Buffer.from(errorMessage)
  //       });
  //
  //       const updatedRotation = await secretRotationV2DAL.updateById(secretRotation.id, {
  //         rotationStatus: SecretRotationStatus.Failed,
  //         lastRotationJobId: jobId,
  //         lastRotationAttemptedAt: new Date(),
  //         encryptedLastRotationMessage: encryptedMessage,
  //         nextRotationAt: getNextUtcRotationInterval(secretRotation.rotateAtUtc as TSecretRotationV2["rotateAtUtc"])
  //       });
  //
  //       if (shouldSendNotification) {
  //         await $queueSendSecretRotationStatusNotification(updatedRotation);
  //       }
  //     }
  //
  //     await auditLogService.createAuditLog({
  //       ...(auditLogInfo ?? {
  //         actor: {
  //           type: ActorType.PLATFORM,
  //           metadata: {}
  //         }
  //       }),
  //       projectId,
  //       event: {
  //         type: EventType.SECRET_ROTATION_ROTATE_SECRETS,
  //         metadata: {
  //           type,
  //           rotationId,
  //           connectionId: connection.id,
  //           folderId,
  //           parameters,
  //           secretsMapping,
  //           occurredAt: new Date(),
  //           status: SecretRotationStatus.Failed,
  //           message: isFinalAttempt ? "See Rotation status for details" : "Rotation will be re-attempted shortly...",
  //           jobId
  //         }
  //       }
  //     });
  //
  //     throw new BadRequestError({ message: errorMessage });
  //   } finally {
  //     await lock?.release();
  //   }
  // };

  // const rotateSecretRotation = async (
  //   { rotationId, type, auditLogInfo }: TRotateSecretRotationV2,
  //   actor: OrgServiceActor
  // ) => {
  //   const plan = await licenseService.getPlan(actor.orgId);
  //
  //   if (!plan.secretRotation)
  //     throw new BadRequestError({
  //       message:
  //         "Failed to rotate secret rotation secrets due to plan restriction. Upgrade plan to rotate secret rotation secrets."
  //     });
  //
  //   const secretRotation = await secretRotationV2DAL.findById(rotationId);
  //
  //   if (!secretRotation)
  //     throw new NotFoundError({
  //       message: `Could not find ${SECRET_ROTATION_NAME_MAP[type]} Rotation with ID "${rotationId}"`
  //     });
  //
  //   const { projectId, environment, folder, connection } = secretRotation;
  //
  //   const { permission } = await permissionService.getProjectPermission({
  //     actor: actor.type,
  //     actorId: actor.id,
  //     actorAuthMethod: actor.authMethod,
  //     actorOrgId: actor.orgId,
  //     actionProjectType: ActionProjectType.SecretManager,
  //     projectId
  //   });
  //
  //   ForbiddenError.from(permission).throwUnlessCan(
  //     ProjectPermissionSecretRotationActions.RotateSecrets,
  //     subject(ProjectPermissionSub.SecretRotation, {
  //       environment: environment.slug,
  //       secretPath: folder.path
  //     })
  //   );
  //
  //   if (connection.app !== SECRET_ROTATION_CONNECTION_MAP[type])
  //     throw new BadRequestError({
  //       message: `Secret Rotation with ID "${rotationId}" is not configured for ${SECRET_ROTATION_NAME_MAP[type]}`
  //     });
  //
  //   const isRotationOccurring = Boolean(await keyStore.getItem(KeyStorePrefixes.SecretRotationLock(secretRotation.id)));
  //
  //   if (isRotationOccurring)
  //     throw new BadRequestError({ message: `A rotation is already in progress. Please try again shortly.` });
  //
  //   try {
  //     const updatedRotation = await rotateGeneratedCredentials(secretRotation, {
  //       auditLogInfo,
  //       isManualRotation: true
  //     });
  //
  //     return await expandSecretRotation(updatedRotation, kmsService);
  //   } catch (err) {
  //     throw new InternalServerError({
  //       message: (err as Error).message ?? "Failed to rotate secrets: check Rotation status for details."
  //     });
  //   }
  // };

  // const getDashboardSecretRotationCount = async (
  //   { projectId, environments, secretPath, search }: TGetDashboardSecretRotationV2Count,
  //   actor: OrgServiceActor
  // ) => {
  //   // we don't check plan for dashboard like dynamic secret, actions will be prevented
  //
  //   const { permission } = await permissionService.getProjectPermission({
  //     actor: actor.type,
  //     actorId: actor.id,
  //     actorAuthMethod: actor.authMethod,
  //     actorOrgId: actor.orgId,
  //     actionProjectType: ActionProjectType.SecretManager,
  //     projectId
  //   });
  //
  //   const permissiveEnvironments = environments.filter((environment) =>
  //     permission.can(
  //       ProjectPermissionSecretRotationActions.Read,
  //       subject(ProjectPermissionSub.SecretRotation, { environment, secretPath })
  //     )
  //   );
  //
  //   if (!permissiveEnvironments.length) return 0;
  //
  //   const folders = await folderDAL.findBySecretPathMultiEnv(projectId, permissiveEnvironments, secretPath);
  //
  //   if (!folders.length) {
  //     throw new NotFoundError({
  //       message: `Folders with path '${secretPath}' in environments with slugs '${permissiveEnvironments.join(
  //         ", "
  //       )}' not found`
  //     });
  //   }
  //
  //   const count = await secretRotationV2DAL.findWithMappedSecretsCount({
  //     $in: { folderId: folders.map((folder) => folder.id) },
  //     search,
  //     projectId
  //   });
  //
  //   return count;
  // };

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
