import { AppConnection } from "@app/hooks/api/appConnections/enums";
import { SecretSync } from "@app/hooks/api/secretSyncs/enums";

export const SECRET_SYNC_MAP: Record<SecretSync, { name: string; image: string }> = {
  [SecretSync.AWSParameterStore]: { name: "Parameter Store", image: "Amazon Web Services.png" }
};

export const SECRET_SYNC_CONNECTION_MAP: Record<SecretSync, AppConnection> = {
  [SecretSync.AWSParameterStore]: AppConnection.AWS
};
