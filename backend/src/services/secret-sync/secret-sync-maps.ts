import { AppConnection } from "@app/services/app-connection/app-connection-enums";
import { awsParameterStoreSyncPushSecrets } from "@app/services/secret-sync/aws-parameter-store/aws-parameter-store-sync-fns";
import { SecretSync } from "@app/services/secret-sync/secret-sync-enums";

export const SECRET_SYNC_NAME_MAP: Record<SecretSync, string> = {
  [SecretSync.AWSParameterStore]: "AWS Parameter Store",
  [SecretSync.GitHub]: "GitHub"
};

export const SECRET_SYNC_CONNECTION_MAP: Record<SecretSync, AppConnection> = {
  [SecretSync.AWSParameterStore]: AppConnection.AWS,
  [SecretSync.GitHub]: AppConnection.GitHub
};

export const SECRET_SYNC_PUSH_SECRETS_MAP: Record<SecretSync, any> = {
  [SecretSync.AWSParameterStore]: awsParameterStoreSyncPushSecrets,
  [SecretSync.GitHub]: awsParameterStoreSyncPushSecrets
};
