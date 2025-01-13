import { BadRequestError } from "@app/lib/errors";
import {
  AWS_PARAMETER_STORE_SYNC_LIST_OPTION,
  AwsParameterStoreSyncFns
} from "@app/services/secret-sync/aws-parameter-store";
import { SecretSync } from "@app/services/secret-sync/secret-sync-enums";
import { SECRET_SYNC_NAME_MAP } from "@app/services/secret-sync/secret-sync-maps";
import {
  TSecretMap,
  TSecretSyncListItem,
  TSecretSyncWithConnection
} from "@app/services/secret-sync/secret-sync-types";

const SECRET_SYNC_LIST_OPTIONS: Record<SecretSync, TSecretSyncListItem> = {
  [SecretSync.AWSParameterStore]: AWS_PARAMETER_STORE_SYNC_LIST_OPTION
};

export const listSecretSyncOptions = () => {
  return Object.values(SECRET_SYNC_LIST_OPTIONS).sort((a, b) => a.name.localeCompare(b.name));
};

const addAffixes = (secretSync: TSecretSyncWithConnection, unprocessedSecretMap: TSecretMap) => {
  let secretMap = { ...unprocessedSecretMap };

  const { appendSuffix, prependPrefix } = secretSync.syncOptions;

  if (appendSuffix || prependPrefix) {
    secretMap = {};
    Object.entries(unprocessedSecretMap).forEach(([key, value]) => {
      secretMap[`${prependPrefix || ""}${key}${appendSuffix || ""}`] = value;
    });
  }

  return secretMap;
};

const stripAffixes = (secretSync: TSecretSyncWithConnection, unprocessedSecretMap: TSecretMap) => {
  let secretMap = { ...unprocessedSecretMap };

  const { appendSuffix, prependPrefix } = secretSync.syncOptions;

  if (appendSuffix || prependPrefix) {
    secretMap = {};
    Object.entries(unprocessedSecretMap).forEach(([key, value]) => {
      let processedKey = key;

      if (prependPrefix && processedKey.startsWith(prependPrefix)) {
        processedKey = processedKey.slice(prependPrefix.length);
      }

      if (appendSuffix && processedKey.endsWith(appendSuffix)) {
        processedKey = processedKey.slice(0, -appendSuffix.length);
      }

      secretMap[processedKey] = value;
    });
  }

  return secretMap;
};

export const SecretSyncFns = {
  syncSecrets: (secretSync: TSecretSyncWithConnection, unprocessedSecretMap: TSecretMap): Promise<void> => {
    const secretMap = addAffixes(secretSync, unprocessedSecretMap);

    switch (secretSync.destination) {
      case SecretSync.AWSParameterStore:
        return AwsParameterStoreSyncFns.syncSecrets(secretSync, secretMap);
      default:
        // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
        throw new Error(`Unhandled sync destination for push secrets: ${secretSync.destination}`);
    }
  },
  importSecrets: async (secretSync: TSecretSyncWithConnection): Promise<TSecretMap> => {
    let secretMap: TSecretMap;
    switch (secretSync.destination) {
      case SecretSync.AWSParameterStore:
        secretMap = await AwsParameterStoreSyncFns.importSecrets(secretSync);
        break;
      default:
        throw new BadRequestError({
          message: `${SECRET_SYNC_NAME_MAP[secretSync.destination as SecretSync]} Syncs do not support pulling.`
        });
    }

    return stripAffixes(secretSync, secretMap);
  },
  removeSecrets: (secretSync: TSecretSyncWithConnection, unprocessedSecretMap: TSecretMap): Promise<void> => {
    const secretMap = addAffixes(secretSync, unprocessedSecretMap);

    switch (secretSync.destination) {
      case SecretSync.AWSParameterStore:
        return AwsParameterStoreSyncFns.removeSecrets(secretSync, secretMap);
      default:
        // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
        throw new Error(`Unhandled sync destination for removing secrets: ${secretSync.destination}`);
    }
  }
};
