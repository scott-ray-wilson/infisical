import {
  AWS_PARAMETER_STORE_SYNC_LIST_OPTION,
  awsParameterStoreSyncPushSecrets
} from "@app/services/secret-sync/aws-parameter-store";
import { GITHUB_SYNC_LIST_OPTION } from "@app/services/secret-sync/github";
import { SecretSync } from "@app/services/secret-sync/secret-sync-enums";
import {
  TSecretMap,
  TSecretSyncListItem,
  TSecretSyncWithConnection
} from "@app/services/secret-sync/secret-sync-types";

const SECRET_SYNC_LIST_OPTIONS: Record<SecretSync, TSecretSyncListItem> = {
  [SecretSync.AWSParameterStore]: AWS_PARAMETER_STORE_SYNC_LIST_OPTION,
  [SecretSync.GitHub]: GITHUB_SYNC_LIST_OPTION
};

export const listSecretSyncOptions = () => {
  return Object.values(SECRET_SYNC_LIST_OPTIONS).sort((a, b) => a.name.localeCompare(b.name));
};

export const secretSyncPushSecrets = (secretSync: TSecretSyncWithConnection, secrets: TSecretMap) => {
  switch (secretSync.destination) {
    case SecretSync.AWSParameterStore:
      return awsParameterStoreSyncPushSecrets(secretSync, secrets);
    default:
      throw new Error(`Unhandled sync destination ${secretSync.destination}`);
  }
};
