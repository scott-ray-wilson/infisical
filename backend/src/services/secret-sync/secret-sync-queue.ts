import opentelemetry from "@opentelemetry/api";
import { AxiosError } from "axios";

import { ProjectMembershipRole } from "@app/db/schemas";
import { TAuditLogServiceFactory } from "@app/ee/services/audit-log/audit-log-service";
import { EventType } from "@app/ee/services/audit-log/audit-log-types";
import { KeyStorePrefixes, KeyStoreTtls, TKeyStoreFactory } from "@app/keystore/keystore";
import { getConfig } from "@app/lib/config/env";
import { InternalServerError } from "@app/lib/errors";
import { getTimeDifferenceInSeconds } from "@app/lib/fn";
import { logger } from "@app/lib/logger";
import { QueueJobs, QueueName, TQueueServiceFactory } from "@app/queue";
import { decryptAppConnectionCredentials } from "@app/services/app-connection/app-connection-fns";
import { ActorType } from "@app/services/auth/auth-type";
import { TKmsServiceFactory } from "@app/services/kms/kms-service";
import { KmsDataKey } from "@app/services/kms/kms-types";
import { TProjectDALFactory } from "@app/services/project/project-dal";
import { TProjectEnvDALFactory } from "@app/services/project-env/project-env-dal";
import { TProjectMembershipDALFactory } from "@app/services/project-membership/project-membership-dal";
import { TSecretFolderDALFactory } from "@app/services/secret-folder/secret-folder-dal";
import { TSecretImportDALFactory } from "@app/services/secret-import/secret-import-dal";
import { fnSecretsV2FromImports } from "@app/services/secret-import/secret-import-fns";
import { TSecretSyncDALFactory } from "@app/services/secret-sync/secret-sync-dal";
import { SecretSync } from "@app/services/secret-sync/secret-sync-enums";
import { secretSyncPushSecrets } from "@app/services/secret-sync/secret-sync-fns";
import { SECRET_SYNC_NAME_MAP } from "@app/services/secret-sync/secret-sync-maps";
import {
  TQueueSecretSyncPayload,
  TQueueSendSecretSyncFailedNotificationsPayload,
  TSecretMap,
  TSecretSyncWithConnection,
  TSendSecretSyncFailedNotificationsJobDTO,
  TSyncSecretsJobDTO,
  TTriggerSecretSyncsByPathDTO,
  TTriggerSyncSecretByIdDTO
} from "@app/services/secret-sync/secret-sync-types";
import { TSecretV2BridgeDALFactory } from "@app/services/secret-v2-bridge/secret-v2-bridge-dal";
import { expandSecretReferencesFactory } from "@app/services/secret-v2-bridge/secret-v2-bridge-fns";
import { SmtpTemplates, TSmtpService } from "@app/services/smtp/smtp-service";

export type TSecretSyncQueueFactory = ReturnType<typeof secretSyncQueueFactory>;

type TSecretSyncQueueFactoryDep = {
  queueService: Pick<TQueueServiceFactory, "queue" | "start">;
  kmsService: Pick<TKmsServiceFactory, "createCipherPairWithDataKey">;
  keyStore: Pick<TKeyStoreFactory, "acquireLock" | "setItemWithExpiry" | "getItem">;
  folderDAL: Pick<TSecretFolderDALFactory, "findBySecretPath" | "findByManySecretPath">;
  secretV2BridgeDAL: Pick<TSecretV2BridgeDALFactory, "findByFolderId" | "find">;
  secretImportDAL: Pick<TSecretImportDALFactory, "find" | "findByFolderIds">;
  secretSyncDAL: Pick<TSecretSyncDALFactory, "findById" | "find" | "updateById">;
  projectEnvDAL: Pick<TProjectEnvDALFactory, "findOne">;
  auditLogService: Pick<TAuditLogServiceFactory, "createAuditLog">;
  projectMembershipDAL: Pick<TProjectMembershipDALFactory, "findAllProjectMembers">;
  projectDAL: Pick<TProjectDALFactory, "findById">;
  smtpService: Pick<TSmtpService, "sendMail">;
};

export const secretSyncQueueFactory = ({
  queueService,
  kmsService,
  keyStore,
  folderDAL,
  secretV2BridgeDAL,
  secretImportDAL,
  secretSyncDAL,
  projectEnvDAL,
  auditLogService,
  projectMembershipDAL,
  projectDAL,
  smtpService
}: TSecretSyncQueueFactoryDep) => {
  const integrationMeter = opentelemetry.metrics.getMeter("SecretSyncs");
  const errorHistogram = integrationMeter.createHistogram("secret_sync_errors", {
    description: "Secret sync errors",
    unit: "1"
  });

  const $queueSecretSync = async (payload: TQueueSecretSyncPayload) =>
    queueService.queue(QueueName.AppConnectionSecretSync, QueueJobs.AppConnectionSyncSecrets, payload, {
      attempts: 5,
      delay: 1000,
      backoff: {
        type: "exponential",
        delay: 3000
      },
      removeOnComplete: true,
      removeOnFail: true
    });

  const $queueSendSecretSyncFailedNotifications = async (payload: TQueueSendSecretSyncFailedNotificationsPayload) => {
    const appCfg = getConfig();
    if (!appCfg.isSmtpConfigured) return;

    await queueService.queue(
      QueueName.AppConnectionSecretSync,
      QueueJobs.AppConnectionSendSecretSyncFailedNotifications,
      payload,
      {
        attempts: 5,
        delay: 1000,
        backoff: {
          type: "exponential",
          delay: 3000
        },
        removeOnFail: true,
        removeOnComplete: true
      }
    );
  };

  const $getSecrets = async ({
    projectId,
    environmentSlug,
    secretPath
  }: {
    projectId: string;
    environmentSlug: string;
    secretPath: string;
  }) => {
    const secretMap: TSecretMap = {};

    const { decryptor: secretManagerDecryptor } = await kmsService.createCipherPairWithDataKey({
      type: KmsDataKey.SecretManager,
      projectId
    });

    const decryptSecretValue = (value?: Buffer | undefined | null) =>
      value ? secretManagerDecryptor({ cipherTextBlob: value }).toString() : "";

    const folder = await folderDAL.findBySecretPath(projectId, environmentSlug, secretPath);
    if (!folder) {
      throw new Error(`Secret path not found for environment "${environmentSlug}" in project with ID "${projectId}"`);
    }

    const { expandSecretReferences } = expandSecretReferencesFactory({
      decryptSecretValue,
      secretDAL: secretV2BridgeDAL,
      folderDAL,
      projectId,
      // on secre syncs we expand all secrets
      canExpandValue: () => true
    });
    // process secrets in current folder
    const secrets = await secretV2BridgeDAL.findByFolderId(folder.id);

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

    // check if current folder has any imports from other folders
    const secretImports = await secretImportDAL.find({ folderId: folder.id, isReplication: false });

    // if no imports then return secrets in the current folder
    if (!secretImports.length) return secretMap;
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

    return secretMap;
  };

  const $syncSecrets = async (job: TSyncSecretsJobDTO) => {
    const {
      data: { secretSync, auditLogInfo, triggeredByUserId }
    } = job;

    logger.info(
      `Secret Sync Push [syncId=${secretSync.id}] [destination=${secretSync.destination}] [projectId=${secretSync.projectId}] [secretPath=${secretSync.secretPath}] [envId=${secretSync.envId}] [connectionId=${secretSync.connectionId}]`
    );

    const {
      connection: { orgId, encryptedCredentials }
    } = secretSync;

    const credentials = await decryptAppConnectionCredentials({
      orgId,
      encryptedCredentials,
      kmsService
    });

    let isSynced = false;
    let syncMessage: string | null = null;
    const isFinalAttempt = job.attemptsStarted === job.opts.attempts;
    let syncError: unknown = null;

    const lock = await keyStore.acquireLock([KeyStorePrefixes.SecretSyncLock(secretSync.id)], 60000, {
      retryCount: 10,
      retryDelay: 3000,
      retryJitter: 500
    });

    const lockAcquiredTime = new Date();

    try {
      const lastSyncAt = await keyStore.getItem(KeyStorePrefixes.SecretSyncLastRunTimestamp(secretSync.id));

      // check whether the integration should wait or not
      if (lastSyncAt) {
        const SYNC_INTERVAL = 2000;

        const timeSinceLastSync = getTimeDifferenceInSeconds(lockAcquiredTime.toISOString(), lastSyncAt);

        // give some time for integration to breath
        if (timeSinceLastSync < SYNC_INTERVAL)
          await new Promise((resolve) => {
            setTimeout(resolve, SYNC_INTERVAL);
          });
      }

      const { projectId, secretPath, environment } = secretSync;

      const secrets = await $getSecrets({ projectId, secretPath, environmentSlug: environment.slug });

      const pushResults = await secretSyncPushSecrets(
        {
          ...secretSync,
          connection: {
            ...secretSync.connection,
            credentials
          }
        } as TSecretSyncWithConnection,
        secrets
      );

      isSynced = pushResults.isSynced;
      syncMessage = pushResults.syncMessage;
    } catch (err) {
      logger.error(
        err,
        `Secret Sync error [syncId=${secretSync.id}] [destination=${secretSync.destination}] [projectId=${secretSync.projectId}] [secretPath=${secretSync.secretPath}] [envId=${secretSync.envId}] [connectionId=${secretSync.connectionId}]`
      );

      const appCfg = getConfig();
      if (appCfg.OTEL_TELEMETRY_COLLECTION_ENABLED) {
        errorHistogram.record(1, {
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

      syncError = err;
    } finally {
      logger.info("Secret Sync lock released for ID %s", secretSync.id);
      await lock.release();

      const ranAt = new Date();

      await auditLogService.createAuditLog({
        projectId: secretSync.projectId,
        ...(auditLogInfo ?? {
          actor: {
            type: ActorType.PLATFORM,
            metadata: {}
          }
        }),
        event: {
          type: EventType.SECRET_SYNC_PUSH,
          metadata: {
            syncId: secretSync.id,
            syncOptions: secretSync.syncOptions,
            envId: secretSync.envId,
            destination: secretSync.destination,
            destinationConfig: secretSync.destinationConfig,
            secretPath: secretSync.secretPath,
            connectionId: secretSync.connectionId,
            jobRanAt: ranAt,
            isSynced,
            jobId: job.id!,
            syncMessage
          }
        }
      });

      if (isSynced || isFinalAttempt) {
        const updatedSecretSync = await secretSyncDAL.updateById(secretSync.id, {
          isSynced,
          lastSyncJobId: job.id,
          lastSyncMessage: syncMessage,
          lastSyncedAt: isSynced ? ranAt : undefined
        });

        if (!isSynced) {
          await $queueSendSecretSyncFailedNotifications({
            secretSync: updatedSecretSync,
            triggeredByUserId
          });
        }
      }
    }

    await keyStore.setItemWithExpiry(
      KeyStorePrefixes.SecretSyncLastRunTimestamp(secretSync.id),
      KeyStoreTtls.SetSecretSyncLastRunTimestampInSeconds,
      lockAcquiredTime.toISOString()
    );

    // re-throw error if job should fail
    if (syncError) throw syncError as Error;

    logger.info("Secret Sync with job ID %s completed", job.id);
  };

  const $sendSecretSyncFailedNotifications = async (job: TSendSecretSyncFailedNotificationsJobDTO) => {
    const appCfg = getConfig();

    const {
      data: { secretSync, triggeredByUserId }
    } = job;

    const { projectId, destination, name, secretPath, lastSyncMessage, environment } = secretSync;

    const projectMembers = await projectMembershipDAL.findAllProjectMembers(projectId);
    const project = await projectDAL.findById(projectId);

    let projectAdmins = projectMembers.filter((member) =>
      member.roles.some((role) => role.role === ProjectMembershipRole.Admin)
    );

    // only notify triggering user if triggered by admin
    if (triggeredByUserId && projectAdmins.map((admin) => admin.userId).includes(triggeredByUserId)) {
      projectAdmins = projectAdmins.filter((admin) => admin.userId === triggeredByUserId);
    }

    const syncDestination = SECRET_SYNC_NAME_MAP[destination as SecretSync];

    await smtpService.sendMail({
      recipients: projectAdmins.map((member) => member.user.email!).filter(Boolean),
      template: SmtpTemplates.SecretSyncFailed,
      subjectLine: `${syncDestination} Sync "${name}" Failed`,
      substitutions: {
        syncName: name,
        syncDestination,
        syncMessage: lastSyncMessage,
        secretPath,
        environment: environment.name,
        projectName: project.name,
        syncUrl: `${appCfg.SITE_URL}/secret-syncs/${project.id}`
      }
    });
  };

  const triggerSecretSyncsByPath = async ({ secretPath, projectId, environmentSlug }: TTriggerSecretSyncsByPathDTO) => {
    const environment = await projectEnvDAL.findOne({ slug: environmentSlug, projectId });

    if (!environment)
      throw new Error(`Cannot find environment with slug "${environmentSlug}" for project with ID "${projectId}"`);

    const secretSyncs = await secretSyncDAL.find({ envId: environment.id, secretPath });

    await Promise.all(secretSyncs.map((secretSync) => $queueSecretSync({ secretSync })));
  };

  const triggerSecretSyncById = async ({ syncId, auditLogInfo }: TTriggerSyncSecretByIdDTO) => {
    const secretSync = await secretSyncDAL.findById(syncId);

    if (!secretSync) throw new Error(`Cannot find secret sync with ID ${syncId}`);

    await $queueSecretSync({ secretSync, auditLogInfo });
  };

  queueService.start(QueueName.AppConnectionSecretSync, async (job) => {
    switch (job.name) {
      case QueueJobs.AppConnectionSyncSecrets:
        await $syncSecrets(job as TSyncSecretsJobDTO);
        break;
      case QueueJobs.AppConnectionSendSecretSyncFailedNotifications:
        await $sendSecretSyncFailedNotifications(job as TSendSecretSyncFailedNotificationsJobDTO);
        break;
      default:
        // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
        throw new InternalServerError({ message: `Unhandled Secret Sync Queue Job ${job.name}` });
    }
  });

  return { triggerSecretSyncById, triggerSecretSyncsByPath };
};
