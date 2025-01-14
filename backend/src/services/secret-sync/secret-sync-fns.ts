import { BadRequestError } from "@app/lib/errors";
import {
  AWS_PARAMETER_STORE_SYNC_LIST_OPTION,
  AwsParameterStoreSyncFns
} from "@app/services/secret-sync/aws-parameter-store";
import { GITHUB_SYNC_LIST_OPTION, GithubSyncFns } from "@app/services/secret-sync/github";
import { SecretSync } from "@app/services/secret-sync/secret-sync-enums";
import { SECRET_SYNC_NAME_MAP } from "@app/services/secret-sync/secret-sync-maps";
import {
  TSecretMap,
  TSecretSyncListItem,
  TSecretSyncWithCredentials
} from "@app/services/secret-sync/secret-sync-types";

const SECRET_SYNC_LIST_OPTIONS: Record<SecretSync, TSecretSyncListItem> = {
  [SecretSync.AWSParameterStore]: AWS_PARAMETER_STORE_SYNC_LIST_OPTION,
  [SecretSync.GitHub]: GITHUB_SYNC_LIST_OPTION
};

export const listSecretSyncOptions = () => {
  return Object.values(SECRET_SYNC_LIST_OPTIONS).sort((a, b) => a.name.localeCompare(b.name));
};

const addAffixes = (secretSync: TSecretSyncWithCredentials, unprocessedSecretMap: TSecretMap) => {
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

const stripAffixes = (secretSync: TSecretSyncWithCredentials, unprocessedSecretMap: TSecretMap) => {
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

// TODO(scott): ideally do this in a map to reduce code but requires typescript trickery...

export const SecretSyncFns = {
  syncSecrets: (secretSync: TSecretSyncWithCredentials, unprocessedSecretMap: TSecretMap): Promise<void> => {
    const secretMap = addAffixes(secretSync, unprocessedSecretMap);

    switch (secretSync.destination) {
      case SecretSync.AWSParameterStore:
        return AwsParameterStoreSyncFns.syncSecrets(secretSync, secretMap);
      case SecretSync.GitHub:
        return GithubSyncFns.syncSecrets(secretSync, secretMap);
      default:
        throw new Error(
          `Unhandled sync destination for push secrets: ${(secretSync as TSecretSyncWithCredentials).destination}`
        );
    }
  },
  importSecrets: async (secretSync: TSecretSyncWithCredentials): Promise<TSecretMap> => {
    let secretMap: TSecretMap;
    switch (secretSync.destination) {
      case SecretSync.AWSParameterStore:
        secretMap = await AwsParameterStoreSyncFns.importSecrets(secretSync);
        break;
      case SecretSync.GitHub:
        secretMap = await GithubSyncFns.importSecrets(secretSync);
        break;
      default:
        throw new BadRequestError({
          message: `${
            SECRET_SYNC_NAME_MAP[(secretSync as TSecretSyncWithCredentials).destination]
          } does not support importing secrets.`
        });
    }

    return stripAffixes(secretSync, secretMap);
  },
  removeSecrets: (secretSync: TSecretSyncWithCredentials, unprocessedSecretMap: TSecretMap): Promise<void> => {
    const secretMap = addAffixes(secretSync, unprocessedSecretMap);

    switch (secretSync.destination) {
      case SecretSync.AWSParameterStore:
        return AwsParameterStoreSyncFns.removeSecrets(secretSync, secretMap);
      case SecretSync.GitHub:
        return GithubSyncFns.removeSecrets(secretSync, secretMap);
      default:
        // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
        throw new Error(
          `Unhandled sync destination for removing secrets: ${(secretSync as TSecretSyncWithCredentials).destination}`
        );
    }
  }
};
