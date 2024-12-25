import { TKeyStoreFactory } from "@app/keystore/keystore";
import { InternalServerError } from "@app/lib/errors";
import { QueueJobs, QueueName, TQueueServiceFactory } from "@app/queue";
import { decryptAppConnectionCredentials } from "@app/services/app-connection/app-connection-fns";
import { TKmsServiceFactory } from "@app/services/kms/kms-service";
import { KmsDataKey } from "@app/services/kms/kms-types";
import { TProjectEnvDALFactory } from "@app/services/project-env/project-env-dal";
import { TSecretFolderDALFactory } from "@app/services/secret-folder/secret-folder-dal";
import { TSecretImportDALFactory } from "@app/services/secret-import/secret-import-dal";
import { fnSecretsV2FromImports } from "@app/services/secret-import/secret-import-fns";
import { TSecretSyncDALFactory } from "@app/services/secret-sync/secret-sync-dal";
import { secretSyncPushSecrets } from "@app/services/secret-sync/secret-sync-fns";
import {
  TSecretMap,
  TSecretSyncPushById,
  TSecretSyncsPushByPathDTO,
  TSecretSyncWithConnection
} from "@app/services/secret-sync/secret-sync-types";
import { TSecretV2BridgeDALFactory } from "@app/services/secret-v2-bridge/secret-v2-bridge-dal";
import { expandSecretReferencesFactory } from "@app/services/secret-v2-bridge/secret-v2-bridge-fns";

export type TSecretSyncQueueFactory = ReturnType<typeof secretSyncQueueFactory>;

type TSecretSyncQueueFactoryDep = {
  queueService: TQueueServiceFactory;
  kmsService: TKmsServiceFactory;
  keyStore: Pick<TKeyStoreFactory, "acquireLock" | "setItemWithExpiry" | "getItem">;
  folderDAL: Pick<TSecretFolderDALFactory, "findBySecretPath" | "findByManySecretPath">;
  secretV2BridgeDAL: Pick<TSecretV2BridgeDALFactory, "findByFolderId" | "find">;
  secretImportDAL: Pick<TSecretImportDALFactory, "find" | "findByFolderIds">;
  secretSyncDAL: Pick<TSecretSyncDALFactory, "findById" | "find">;
  projectEnvDAL: Pick<TProjectEnvDALFactory, "findOne">;
};

export const secretSyncQueueFactory = ({
  queueService,
  kmsService,
  // keyStore,
  folderDAL,
  secretV2BridgeDAL,
  secretImportDAL,
  secretSyncDAL,
  projectEnvDAL
}: TSecretSyncQueueFactoryDep) => {
  // TODO: telemetry
  // const integrationMeter = opentelemetry.metrics.getMeter("Integrations");
  // const errorHistogram = integrationMeter.createHistogram("integration_secret_sync_errors", {
  //     description: "Integration secret sync errors",
  //     unit: "1"
  // });

  /**
   * Return the secrets in a given [folderId] including secrets from
   * nested imported folders recursively.
   */
  const getSecrets = async ({
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

  const pushSecrets = async (
    secretSync: NonNullable<Awaited<ReturnType<typeof secretSyncDAL.findById>>>,
    secrets: TSecretMap
  ) => {
    const {
      connection: { orgId, encryptedCredentials }
    } = secretSync;

    const credentials = await decryptAppConnectionCredentials({
      orgId,
      encryptedCredentials,
      kmsService
    });

    try {
      const response = await secretSyncPushSecrets(
        {
          ...secretSync,
          connection: {
            ...secretSync.connection,
            credentials
          }
        } as TSecretSyncWithConnection,
        secrets
      );
    } catch (e) {
      console.error(e);
    }
  };

  const pushSecretsBySyncId = async ({ syncId }: TSecretSyncPushById) => {
    const secretSync = await secretSyncDAL.findById(syncId);

    if (!secretSync) throw new Error(`Cannot find secret sync with ID ${syncId}`);

    const { projectId, environment, secretPath } = secretSync;

    const secrets = await getSecrets({ projectId, environmentSlug: environment.slug, secretPath });

    await pushSecrets(secretSync, secrets);
  };

  const pushSecretsBySecretPath = async ({ secretPath, projectId, environmentSlug }: TSecretSyncsPushByPathDTO) => {
    const secrets = await getSecrets({ projectId, environmentSlug, secretPath });

    const environment = await projectEnvDAL.findOne({ slug: environmentSlug, projectId });

    if (!environment)
      throw new Error(`Cannot find environment with slug "${environmentSlug}" for project with ID "${projectId}"`);

    const secretSyncs = await secretSyncDAL.find({ envId: environment.id, secretPath });

    for await (const secretSync of secretSyncs) {
      await pushSecrets(secretSync, secrets);
    }
  };

  const triggerPushSecretsBySyncId = async (params: TSecretSyncPushById) => {
    await queueService.queue(QueueName.AppConnectionSecretSync, QueueJobs.AppConnectionTriggerSecretSync, params, {
      attempts: 5,
      delay: 1000,
      backoff: {
        type: "exponential",
        delay: 3000
      },
      removeOnComplete: true,
      removeOnFail: true
    });
  };

  queueService.start(QueueName.AppConnectionSecretSync, async (job) => {
    switch (job.name) {
      case QueueJobs.AppConnectionTriggerSecretSync:
        await pushSecretsBySyncId(job.data as TSecretSyncPushById);
        break;
      case QueueJobs.AppConnectionTriggerSecretSyncs:
        await pushSecretsBySecretPath(job.data as TSecretSyncsPushByPathDTO);
        break;
      case QueueJobs.AppConnectionSendSecretSyncFailedEmails:
        // TODO
        break;
      default:
        // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
        throw new InternalServerError({ message: `Unhandled App Connection Secret Synce Queue Job ${job.name}` });
    }
  });

  return { triggerPushSecretsBySyncId };
};
