import { AppConnection } from "@app/hooks/api/appConnections/enums";
import { SecretSync } from "@app/hooks/api/secretSyncs/enums";

export type TSecretSyncOptionBase = {
  name: string;
};

export type TAwsParameterStoreSyncOption = TSecretSyncOptionBase & {
  connection: AppConnection.AWS;
  destination: SecretSync.AWSParameterStore;
};

export type TGitHubSyncOption = TSecretSyncOptionBase & {
  connection: AppConnection.GitHub;
  destination: SecretSync.GitHub;
};

export type TSecretSyncOption = TAwsParameterStoreSyncOption | TGitHubSyncOption;

export type TAppConnectionOptionMap = {
  [AppConnection.AWS]: TAwsParameterStoreSyncOption;
  [AppConnection.GitHub]: TGitHubSyncOption;
};
