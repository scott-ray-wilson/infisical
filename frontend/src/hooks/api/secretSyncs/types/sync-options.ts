import { AppConnection } from "@app/hooks/api/appConnections/enums";
import { SecretSync } from "@app/hooks/api/secretSyncs";

export type TSecretSyncOptionBase = {
  name: string;
};

export type TAwsParameterStoreSyncOption = TSecretSyncOptionBase & {
  connection: AppConnection.AWS;
  destination: SecretSync.AWSParameterStore;
};

export type TSecretSyncOption = TAwsParameterStoreSyncOption;
