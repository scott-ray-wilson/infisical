import opentelemetry from "@opentelemetry/api";
import { AxiosError } from "axios";

import { ProjectMembershipRole, SecretType } from "@app/db/schemas";
import { TAuditLogServiceFactory } from "@app/ee/services/audit-log/audit-log-service";
import { EventType } from "@app/ee/services/audit-log/audit-log-types";
import { KeyStorePrefixes, TKeyStoreFactory } from "@app/keystore/keystore";
import { getConfig } from "@app/lib/config/env";
import { InternalServerError } from "@app/lib/errors";
import { logger } from "@app/lib/logger";
import { QueueJobs, QueueName, TQueueServiceFactory } from "@app/queue";
import { decryptAppConnectionCredentials } from "@app/services/app-connection/app-connection-fns";
import { ActorType } from "@app/services/auth/auth-type";
import { TKmsServiceFactory } from "@app/services/kms/kms-service";
import { KmsDataKey } from "@app/services/kms/kms-types";
import { TProjectDALFactory } from "@app/services/project/project-dal";
import { TProjectBotDALFactory } from "@app/services/project-bot/project-bot-dal";
import { TProjectMembershipDALFactory } from "@app/services/project-membership/project-membership-dal";
import { TSecretDALFactory } from "@app/services/secret/secret-dal";
import { createManySecretsRawFnFactory, updateManySecretsRawFnFactory } from "@app/services/secret/secret-fns";
import { TSecretVersionDALFactory } from "@app/services/secret/secret-version-dal";
import { TSecretVersionTagDALFactory } from "@app/services/secret/secret-version-tag-dal";
import { TSecretBlindIndexDALFactory } from "@app/services/secret-blind-index/secret-blind-index-dal";
import { TSecretFolderDALFactory } from "@app/services/secret-folder/secret-folder-dal";
import { TSecretImportDALFactory } from "@app/services/secret-import/secret-import-dal";
import { fnSecretsV2FromImports } from "@app/services/secret-import/secret-import-fns";
import { TSecretSyncDALFactory } from "@app/services/secret-sync/secret-sync-dal";
import { SecretSync, SecretSyncImportBehavior } from "@app/services/secret-sync/secret-sync-enums";
import { SecretSyncFns } from "@app/services/secret-sync/secret-sync-fns";
import { SECRET_SYNC_NAME_MAP } from "@app/services/secret-sync/secret-sync-maps";
import {
  SecretSyncAction,
  SecretSyncStatus,
  TQueueSecretSyncImportSecretsByIdDTO,
  TQueueSecretSyncRemoveSecretsByIdDTO,
  TQueueSecretSyncsByPathDTO,
  TQueueSecretSyncSyncSecretsByIdDTO,
  TQueueSendSecretSyncActionFailedNotificationsDTO,
  TSecretMap,
  TSecretSyncImportSecretsDTO,
  TSecretSyncRaw,
  TSecretSyncRemoveSecretsDTO,
  TSecretSyncSyncSecretsDTO,
  TSecretSyncWithConnection,
  TSendSecretSyncFailedNotificationsJobDTO
} from "@app/services/secret-sync/secret-sync-types";
import { TSecretTagDALFactory } from "@app/services/secret-tag/secret-tag-dal";
import { TSecretV2BridgeDALFactory } from "@app/services/secret-v2-bridge/secret-v2-bridge-dal";
import { expandSecretReferencesFactory } from "@app/services/secret-v2-bridge/secret-v2-bridge-fns";
import { TSecretVersionV2DALFactory } from "@app/services/secret-v2-bridge/secret-version-dal";
import { TSecretVersionV2TagDALFactory } from "@app/services/secret-v2-bridge/secret-version-tag-dal";
import { SmtpTemplates, TSmtpService } from "@app/services/smtp/smtp-service";

export type TSecretSyncQueueFactory = ReturnType<typeof secretSyncQueueFactory>;

type TSecretSyncQueueFactoryDep = {
  queueService: Pick<TQueueServiceFactory, "queue" | "start">;
  kmsService: Pick<TKmsServiceFactory, "createCipherPairWithDataKey">;
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
  secretImportDAL: Pick<TSecretImportDALFactory, "find" | "findByFolderIds">;
  secretSyncDAL: Pick<TSecretSyncDALFactory, "findById" | "find" | "updateById">;
  auditLogService: Pick<TAuditLogServiceFactory, "createAuditLog">;
  projectMembershipDAL: Pick<TProjectMembershipDALFactory, "findAllProjectMembers">;
  projectDAL: TProjectDALFactory;
  smtpService: Pick<TSmtpService, "sendMail">;
  projectBotDAL: TProjectBotDALFactory;
  secretDAL: TSecretDALFactory;
  secretVersionDAL: TSecretVersionDALFactory;
  secretBlindIndexDAL: TSecretBlindIndexDALFactory;
  secretTagDAL: TSecretTagDALFactory;
  secretVersionTagDAL: TSecretVersionTagDALFactory;
  secretVersionV2BridgeDAL: Pick<TSecretVersionV2DALFactory, "insertMany" | "findLatestVersionMany">;
  secretVersionTagV2BridgeDAL: Pick<TSecretVersionV2TagDALFactory, "insertMany">;
};

export const secretSyncQueueFactory = ({
  queueService,
  kmsService,
  keyStore,
  folderDAL,
  secretV2BridgeDAL,
  secretImportDAL,
  secretSyncDAL,
  auditLogService,
  projectMembershipDAL,
  projectDAL,
  smtpService,
  projectBotDAL,
  secretDAL,
  secretVersionDAL,
  secretBlindIndexDAL,
  secretTagDAL,
  secretVersionTagDAL,
  secretVersionV2BridgeDAL,
  secretVersionTagV2BridgeDAL
}: TSecretSyncQueueFactoryDep) => {
  const appCfg = getConfig();

  const integrationMeter = opentelemetry.metrics.getMeter("SecretSyncs");
  const syncSecretsErrorHistogram = integrationMeter.createHistogram("secret_sync_sync_secrets_errors", {
    description: "Secret Sync - sync secrets errors",
    unit: "1"
  });
  const importSecretsErrorHistogram = integrationMeter.createHistogram("secret_sync_import_secrets_errors", {
    description: "Secret Sync - import secrets errors",
    unit: "1"
  });
  const removeSecretsErrorHistogram = integrationMeter.createHistogram("secret_sync_remove_secrets_errors", {
    description: "Secret Sync - remove secrets errors",
    unit: "1"
  });

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
    secretVersionTagV2BridgeDAL
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
    secretVersionTagV2BridgeDAL
  });

  const $getSecrets = async (secretSync: TSecretSyncRaw, includeImports = true) => {
    const {
      projectId,
      folderId,
      environment: { slug: environmentSlug },
      folder: { path: secretPath }
    } = secretSync;

    const secretMap: TSecretMap = {};

    const { decryptor: secretManagerDecryptor } = await kmsService.createCipherPairWithDataKey({
      type: KmsDataKey.SecretManager,
      projectId
    });

    const decryptSecretValue = (value?: Buffer | undefined | null) =>
      value ? secretManagerDecryptor({ cipherTextBlob: value }).toString() : "";

    const { expandSecretReferences } = expandSecretReferencesFactory({
      decryptSecretValue,
      secretDAL: secretV2BridgeDAL,
      folderDAL,
      projectId,
      canExpandValue: () => true
    });

    const secrets = await secretV2BridgeDAL.findByFolderId(folderId);

    await Promise.allSettled(
      secrets.map(async (secret) => {
        const secretKey = secret.key;
        const secretValue = decryptSecretValue(secret.encryptedValue);
        const expandedSecretValue = await expandSecretReferences({
          environment: environmentSlug,
          secretPath,
          skipMultilineEncoding: secret.skipMultilineEncoding,
          value: secretValue
        });
        secretMap[secretKey] = { value: expandedSecretValue || "" };

        if (secret.encryptedComment) {
          const commentValue = decryptSecretValue(secret.encryptedComment);
          secretMap[secretKey].comment = commentValue;
        }

        secretMap[secretKey].skipMultilineEncoding = Boolean(secret.skipMultilineEncoding);
      })
    );

    if (!includeImports) return secretMap;

    const secretImports = await secretImportDAL.find({ folderId, isReplication: false });

    if (secretImports.length) {
      const importedSecrets = await fnSecretsV2FromImports({
        decryptor: decryptSecretValue,
        folderDAL,
        secretDAL: secretV2BridgeDAL,
        expandSecretReferences,
        secretImportDAL,
        secretImports,
        hasSecretAccess: () => true
      });

      for (let i = importedSecrets.length - 1; i >= 0; i -= 1) {
        for (let j = 0; j < importedSecrets[i].secrets.length; j += 1) {
          const importedSecret = importedSecrets[i].secrets[j];
          if (!secretMap[importedSecret.key]) {
            secretMap[importedSecret.key] = {
              skipMultilineEncoding: importedSecret.skipMultilineEncoding,
              comment: importedSecret.secretComment,
              value: importedSecret.secretValue || ""
            };
          }
        }
      }
    }

    return secretMap;
  };

  const queueSecretSyncSyncSecretsById = async (payload: TQueueSecretSyncSyncSecretsByIdDTO) =>
    queueService.queue(QueueName.AppConnectionSecretSync, QueueJobs.SecretSyncSyncSecrets, payload, {
      attempts: 5,
      delay: 1000,
      backoff: {
        type: "exponential",
        delay: 3000
      },
      removeOnComplete: true,
      removeOnFail: true
    });

  const queueSecretSyncImportSecretsById = async (payload: TQueueSecretSyncImportSecretsByIdDTO) =>
    queueService.queue(QueueName.AppConnectionSecretSync, QueueJobs.SecretSyncImportSecrets, payload, {
      attempts: 5,
      delay: 1000,
      backoff: {
        type: "exponential",
        delay: 3000
      },
      removeOnComplete: true,
      removeOnFail: true
    });

  const queueSecretSyncRemoveSecretsById = async (payload: TQueueSecretSyncRemoveSecretsByIdDTO) =>
    queueService.queue(QueueName.AppConnectionSecretSync, QueueJobs.SecretSyncRemoveSecrets, payload, {
      attempts: 5,
      delay: 1000,
      backoff: {
        type: "exponential",
        delay: 3000
      },
      removeOnComplete: true,
      removeOnFail: true
    });

  const $queueSendSecretSyncFailedNotifications = async (payload: TQueueSendSecretSyncActionFailedNotificationsDTO) => {
    if (!appCfg.isSmtpConfigured) return;

    await queueService.queue(
      QueueName.AppConnectionSecretSync,
      QueueJobs.SecretSyncSendActionFailedNotifications,
      payload,
      {
        jobId: `secret-sync-${payload.secretSync.id}-failed-notifications`,
        attempts: 5,
        delay: 1000 * 60,
        backoff: {
          type: "exponential",
          delay: 3000
        },
        removeOnFail: true,
        removeOnComplete: true
      }
    );
  };

  const $syncSecrets = async (job: TSecretSyncSyncSecretsDTO) => {
    const {
      data: { syncId, auditLogInfo }
    } = job;

    const secretSync = await secretSyncDAL.findById(syncId);

    if (!secretSync) throw new Error(`Cannot find secret sync with ID ${syncId}`);

    await secretSyncDAL.updateById(syncId, {
      syncStatus: SecretSyncStatus.Running
    });

    logger.info(
      `SecretSync Sync [syncId=${secretSync.id}] [destination=${secretSync.destination}] [projectId=${secretSync.projectId}] [folderId=${secretSync.folderId}] [connectionId=${secretSync.connectionId}]`
    );

    let isSynced = false;
    let syncMessage: string | null = null;
    const isFinalAttempt = job.attemptsStarted === job.opts.attempts;

    try {
      const {
        connection: { orgId, encryptedCredentials }
      } = secretSync;

      const credentials = await decryptAppConnectionCredentials({
        orgId,
        encryptedCredentials,
        kmsService
      });

      const secretMap = await $getSecrets(secretSync);

      await SecretSyncFns.syncSecrets(
        {
          ...secretSync,
          connection: {
            ...secretSync.connection,
            credentials
          }
        } as TSecretSyncWithConnection,
        secretMap
      );

      isSynced = true;
    } catch (err) {
      logger.error(
        err,
        `SecretSync Sync Error [syncId=${secretSync.id}] [destination=${secretSync.destination}] [projectId=${secretSync.projectId}] [folderId=${secretSync.folderId}] [connectionId=${secretSync.connectionId}]`
      );

      if (appCfg.OTEL_TELEMETRY_COLLECTION_ENABLED) {
        syncSecretsErrorHistogram.record(1, {
          version: 1,
          destination: secretSync.destination,
          syncId: secretSync.id,
          projectId: secretSync.projectId,
          type: err instanceof AxiosError ? "AxiosError" : err?.constructor?.name || "UnknownError",
          status: err instanceof AxiosError ? err.response?.status : undefined,
          name: err instanceof Error ? err.name : undefined
        });
      }

      syncMessage =
        // eslint-disable-next-line no-nested-ternary
        (err instanceof AxiosError
          ? err?.response?.data
            ? JSON.stringify(err?.response?.data)
            : err?.message
          : (err as Error)?.message) || "An unknown error occurred.";

      // re-throw so job fails
      throw err;
    } finally {
      const ranAt = new Date();
      const syncStatus = isSynced ? SecretSyncStatus.Succeeded : SecretSyncStatus.Failed;

      await auditLogService.createAuditLog({
        projectId: secretSync.projectId,
        ...(auditLogInfo ?? {
          actor: {
            type: ActorType.PLATFORM,
            metadata: {}
          }
        }),
        event: {
          type: EventType.SECRET_SYNC_SYNC_SECRETS,
          metadata: {
            syncId: secretSync.id,
            syncOptions: secretSync.syncOptions,
            destination: secretSync.destination,
            destinationConfig: secretSync.destinationConfig,
            folderId: secretSync.folderId,
            connectionId: secretSync.connectionId,
            jobRanAt: ranAt,
            jobId: job.id!,
            syncStatus,
            syncMessage
          }
        }
      });

      if (isSynced || isFinalAttempt) {
        const updatedSecretSync = await secretSyncDAL.updateById(secretSync.id, {
          syncStatus,
          lastSyncJobId: job.id,
          lastSyncMessage: syncMessage,
          lastSyncedAt: isSynced ? ranAt : undefined
        });

        if (!isSynced) {
          await $queueSendSecretSyncFailedNotifications({
            secretSync: updatedSecretSync,
            action: SecretSyncAction.SyncSecrets
          });
        }
      }
    }

    logger.info("SecretSync Sync Job with ID %s Completed", job.id);
  };

  const $importSecrets = async (job: TSecretSyncImportSecretsDTO) => {
    const {
      data: { syncId, auditLogInfo, importBehavior }
    } = job;

    const secretSync = await secretSyncDAL.findById(syncId);

    if (!secretSync) throw new Error(`Cannot find secret sync with ID ${syncId}`);

    await secretSyncDAL.updateById(syncId, {
      importStatus: SecretSyncStatus.Running
    });

    logger.info(
      `SecretSync Import [syncId=${secretSync.id}] [destination=${secretSync.destination}] [projectId=${secretSync.projectId}] [folderId=${secretSync.folderId}] [connectionId=${secretSync.connectionId}]`
    );

    let isSuccess = false;
    let importMessage: string | null = null;
    const isFinalAttempt = job.attemptsStarted === job.opts.attempts;

    try {
      const {
        connection: { orgId, encryptedCredentials },
        projectId,
        environment
      } = secretSync;

      const credentials = await decryptAppConnectionCredentials({
        orgId,
        encryptedCredentials,
        kmsService
      });

      const importedSecrets = await SecretSyncFns.importSecrets({
        ...secretSync,
        connection: {
          ...secretSync.connection,
          credentials
        }
      } as TSecretSyncWithConnection);

      if (Object.keys(importedSecrets).length) {
        const secretMap = await $getSecrets(secretSync, false);

        const secretsToCreate: Parameters<typeof $createManySecretsRawFn>[0]["secrets"] = [];
        const secretsToUpdate: Parameters<typeof $updateManySecretsRawFn>[0]["secrets"] = [];

        Object.entries(importedSecrets).forEach(([key, { value }]) => {
          const secret = {
            secretName: key,
            secretValue: value,
            type: SecretType.Shared,
            secretComment: ""
          };

          if (Object.hasOwn(secretMap, key)) {
            secretsToUpdate.push(secret);
          } else {
            secretsToCreate.push(secret);
          }
        });

        if (secretsToCreate.length) {
          await $createManySecretsRawFn({
            projectId,
            path: secretSync.folder.path,
            environment: environment.slug,
            secrets: secretsToCreate
          });
        }

        if (importBehavior === SecretSyncImportBehavior.PrioritizeDestination && secretsToUpdate.length) {
          await $updateManySecretsRawFn({
            projectId,
            path: secretSync.folder.path,
            environment: environment.slug,
            secrets: secretsToUpdate
          });
        }
      }

      isSuccess = true;
    } catch (err) {
      logger.error(
        err,
        `SecretSync Import Error [syncId=${secretSync.id}] [destination=${secretSync.destination}] [projectId=${secretSync.projectId}] [folderId=${secretSync.folderId}] [connectionId=${secretSync.connectionId}]`
      );

      if (appCfg.OTEL_TELEMETRY_COLLECTION_ENABLED) {
        importSecretsErrorHistogram.record(1, {
          version: 1,
          destination: secretSync.destination,
          syncId: secretSync.id,
          projectId: secretSync.projectId,
          type: err instanceof AxiosError ? "AxiosError" : err?.constructor?.name || "UnknownError",
          status: err instanceof AxiosError ? err.response?.status : undefined,
          name: err instanceof Error ? err.name : undefined
        });
      }

      importMessage =
        // eslint-disable-next-line no-nested-ternary
        (err instanceof AxiosError
          ? err?.response?.data
            ? JSON.stringify(err?.response?.data)
            : err?.message
          : (err as Error)?.message) || "An unknown error occurred.";

      // re-throw so job fails
      throw err;
    } finally {
      const ranAt = new Date();
      const importStatus = isSuccess ? SecretSyncStatus.Succeeded : SecretSyncStatus.Failed;

      await auditLogService.createAuditLog({
        projectId: secretSync.projectId,
        ...(auditLogInfo ?? {
          actor: {
            type: ActorType.PLATFORM,
            metadata: {}
          }
        }),
        event: {
          type: EventType.SECRET_SYNC_IMPORT_SECRETS,
          metadata: {
            syncId: secretSync.id,
            syncOptions: secretSync.syncOptions,
            destination: secretSync.destination,
            destinationConfig: secretSync.destinationConfig,
            folderId: secretSync.folderId,
            connectionId: secretSync.connectionId,
            jobRanAt: ranAt,
            jobId: job.id!,
            importStatus,
            importMessage,
            importBehavior
          }
        }
      });

      if (isSuccess || isFinalAttempt) {
        const updatedSecretSync = await secretSyncDAL.updateById(secretSync.id, {
          importStatus,
          lastImportJobId: job.id,
          lastImportMessage: importMessage,
          lastImportedAt: isSuccess ? ranAt : undefined
        });

        if (!isSuccess) {
          await $queueSendSecretSyncFailedNotifications({
            secretSync: updatedSecretSync,
            action: SecretSyncAction.ImportSecrets
          });
        }
      }
    }

    logger.info("SecretSync Import Job with ID %s Completed", job.id);
  };

  const $removeSecrets = async (job: TSecretSyncRemoveSecretsDTO) => {
    const {
      data: { syncId, auditLogInfo }
    } = job;

    const secretSync = await secretSyncDAL.findById(syncId);

    if (!secretSync) throw new Error(`Cannot find secret sync with ID ${syncId}`);

    await secretSyncDAL.updateById(syncId, {
      removeStatus: SecretSyncStatus.Running
    });

    logger.info(
      `SecretSync Remove [syncId=${secretSync.id}] [destination=${secretSync.destination}] [projectId=${secretSync.projectId}] [folderId=${secretSync.folderId}] [connectionId=${secretSync.connectionId}]`
    );

    let isSuccess = false;
    let removeMessage: string | null = null;
    const isFinalAttempt = job.attemptsStarted === job.opts.attempts;

    try {
      const {
        connection: { orgId, encryptedCredentials }
      } = secretSync;

      const credentials = await decryptAppConnectionCredentials({
        orgId,
        encryptedCredentials,
        kmsService
      });

      const secretMap = await $getSecrets(secretSync);

      await SecretSyncFns.removeSecrets(
        {
          ...secretSync,
          connection: {
            ...secretSync.connection,
            credentials
          }
        } as TSecretSyncWithConnection,
        secretMap
      );

      isSuccess = true;
    } catch (err) {
      logger.error(
        err,
        `SecretSync Remove Error [syncId=${secretSync.id}] [destination=${secretSync.destination}] [projectId=${secretSync.projectId}] [folderId=${secretSync.folderId}] [connectionId=${secretSync.connectionId}]`
      );

      if (appCfg.OTEL_TELEMETRY_COLLECTION_ENABLED) {
        removeSecretsErrorHistogram.record(1, {
          version: 1,
          destination: secretSync.destination,
          syncId: secretSync.id,
          projectId: secretSync.projectId,
          type: err instanceof AxiosError ? "AxiosError" : err?.constructor?.name || "UnknownError",
          status: err instanceof AxiosError ? err.response?.status : undefined,
          name: err instanceof Error ? err.name : undefined
        });
      }

      removeMessage =
        // eslint-disable-next-line no-nested-ternary
        (err instanceof AxiosError
          ? err?.response?.data
            ? JSON.stringify(err?.response?.data)
            : err?.message
          : (err as Error)?.message) || "An unknown error occurred.";

      // re-throw so job fails
      throw err;
    } finally {
      const ranAt = new Date();
      const removeStatus = isSuccess ? SecretSyncStatus.Succeeded : SecretSyncStatus.Failed;

      await auditLogService.createAuditLog({
        projectId: secretSync.projectId,
        ...(auditLogInfo ?? {
          actor: {
            type: ActorType.PLATFORM,
            metadata: {}
          }
        }),
        event: {
          type: EventType.SECRET_SYNC_REMOVE_SECRETS,
          metadata: {
            syncId: secretSync.id,
            syncOptions: secretSync.syncOptions,
            destination: secretSync.destination,
            destinationConfig: secretSync.destinationConfig,
            folderId: secretSync.folderId,
            connectionId: secretSync.connectionId,
            jobRanAt: ranAt,
            jobId: job.id!,
            removeStatus,
            removeMessage
          }
        }
      });

      if (isSuccess || isFinalAttempt) {
        const updatedSecretSync = await secretSyncDAL.updateById(secretSync.id, {
          removeStatus,
          lastRemoveJobId: job.id,
          lastRemoveMessage: removeMessage,
          lastRemovedAt: isSuccess ? ranAt : undefined
        });

        if (!isSuccess) {
          await $queueSendSecretSyncFailedNotifications({
            secretSync: updatedSecretSync,
            action: SecretSyncAction.RemoveSecrets
          });
        }
      }
    }

    logger.info("SecretSync Remove Job with ID %s Completed", job.id);
  };

  const $sendSecretSyncFailedNotifications = async (job: TSendSecretSyncFailedNotificationsJobDTO) => {
    const {
      data: { secretSync, auditLogInfo, action }
    } = job;

    const { projectId, destination, name, folder, lastSyncMessage, lastRemoveMessage, lastImportMessage, environment } =
      secretSync;

    const projectMembers = await projectMembershipDAL.findAllProjectMembers(projectId);
    const project = await projectDAL.findById(projectId);

    let projectAdmins = projectMembers.filter((member) =>
      member.roles.some((role) => role.role === ProjectMembershipRole.Admin)
    );

    const triggeredByUserId =
      auditLogInfo && auditLogInfo.actor.type === ActorType.USER && auditLogInfo.actor.metadata.userId;

    // only notify triggering user if triggered by admin
    if (triggeredByUserId && projectAdmins.map((admin) => admin.userId).includes(triggeredByUserId)) {
      projectAdmins = projectAdmins.filter((admin) => admin.userId === triggeredByUserId);
    }

    const syncDestination = SECRET_SYNC_NAME_MAP[destination as SecretSync];

    let actionLabel: string;
    let failureMessage: string | null | undefined;

    switch (action) {
      case SecretSyncAction.ImportSecrets:
        actionLabel = "Import";
        failureMessage = lastImportMessage;

        break;
      case SecretSyncAction.RemoveSecrets:
        actionLabel = "Remove";
        failureMessage = lastRemoveMessage;

        break;
      case SecretSyncAction.SyncSecrets:
      default:
        actionLabel = `Sync`;
        failureMessage = lastSyncMessage;
        break;
    }

    await smtpService.sendMail({
      recipients: projectAdmins.map((member) => member.user.email!).filter(Boolean),
      template: SmtpTemplates.SecretSyncFailed,
      subjectLine: `Secret Sync Failed to ${actionLabel} Secrets`,
      substitutions: {
        syncName: name,
        syncDestination,
        content: `Your ${syncDestination} Sync named "${name}" failed while attempting to ${action.toLowerCase()} secrets.`,
        failureMessage,
        secretPath: folder.path,
        environment: environment.name,
        projectName: project.name,
        syncUrl: `${appCfg.SITE_URL}/integrations/secret-syncs/${destination}/${secretSync.id}`
      }
    });
  };

  const queueSecretSyncsSyncSecretsByPath = async ({
    secretPath,
    projectId,
    environmentSlug
  }: TQueueSecretSyncsByPathDTO) => {
    const folder = await folderDAL.findBySecretPath(projectId, environmentSlug, secretPath);

    if (!folder)
      throw new Error(
        `Could not find folder at path "${secretPath}" for environment with slug "${environmentSlug}" in project with ID "${projectId}"`
      );

    const secretSyncs = await secretSyncDAL.find({ folderId: folder.id, isEnabled: true });

    await Promise.all(secretSyncs.map((secretSync) => queueSecretSyncSyncSecretsById({ syncId: secretSync.id })));
  };

  queueService.start(QueueName.AppConnectionSecretSync, async (job) => {
    if (job.name === QueueJobs.SecretSyncSendActionFailedNotifications) {
      await $sendSecretSyncFailedNotifications(job as TSendSecretSyncFailedNotificationsJobDTO);
      return;
    }

    const { syncId } = job.data as
      | TQueueSecretSyncSyncSecretsByIdDTO
      | TQueueSecretSyncImportSecretsByIdDTO
      | TQueueSecretSyncRemoveSecretsByIdDTO;

    logger.info("Acquiring lock...");

    let lock: Awaited<ReturnType<typeof keyStore.acquireLock>>;

    try {
      lock = await keyStore.acquireLock([KeyStorePrefixes.SecretSyncLock(syncId)], 5 * 60 * 1000);
    } catch (e) {
      logger.error("Failed to acquire lock!");
      return;
    }

    try {
      switch (job.name) {
        case QueueJobs.SecretSyncSyncSecrets:
          await $syncSecrets(job as TSecretSyncSyncSecretsDTO);
          break;
        case QueueJobs.SecretSyncImportSecrets:
          await $importSecrets(job as TSecretSyncImportSecretsDTO);
          break;
        case QueueJobs.SecretSyncRemoveSecrets:
          await $removeSecrets(job as TSecretSyncRemoveSecretsDTO);
          break;
        default:
          throw new InternalServerError({
            // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
            message: `Unhandled Secret Sync Job ${job.name}`
          });
      }
    } finally {
      await lock.release();
    }
  });

  return {
    queueSecretSyncSyncSecretsById,
    queueSecretSyncImportSecretsById,
    queueSecretSyncRemoveSecretsById,
    queueSecretSyncsSyncSecretsByPath
  };
};
