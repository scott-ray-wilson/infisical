import { AppConnection } from "@app/hooks/api/appConnections/enums";
import { SecretSync } from "@app/hooks/api/secretSyncs/enums";

export type TSecretSyncOptionBase = {
  name: string;
};

export type TAwsParameterStoreSyncOption = TSecretSyncOptionBase & {
  app: AppConnection.AWS;
  slug: SecretSync.AWSParameterStore;
};

export type TGitHubSyncOption = TSecretSyncOptionBase & {
  app: AppConnection.GitHub;
  slug: SecretSync.GitHub;
};

export type TSecretSyncOption = TAwsParameterStoreSyncOption | TGitHubSyncOption;

export type TAppConnectionOptionMap = {
  [AppConnection.AWS]: TAwsParameterStoreSyncOption;
  [AppConnection.GitHub]: TGitHubSyncOption;
};
