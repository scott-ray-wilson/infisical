import { AWS_PARAMETER_STORE_LIST_OPTION } from "@app/lib/secret-syncs/aws-parameter-store";
import { SecretSync, TSecretSyncListItem } from "@app/lib/secret-syncs/index";

const SECRET_SYNC_LIST_OPTIONS: Record<SecretSync, TSecretSyncListItem> = {
  [SecretSync.AWSParameterStore]: AWS_PARAMETER_STORE_LIST_OPTION
};

export const listSecretSyncOptions = () => {
  return Object.values(SECRET_SYNC_LIST_OPTIONS).sort((a, b) => a.name.localeCompare(b.name));
};
