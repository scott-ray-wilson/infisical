import { AppConnection } from "@app/hooks/api/appConnections/enums";
import { SecretSync } from "@app/hooks/api/secretSyncs/enums";
import { TRootSecretSync } from "@app/hooks/api/secretSyncs/types/root-connection";

export type TAwsParameterStoreSync = TRootSecretSync & {
  destination: SecretSync.AWSParameterStore;
  destinationConfig: {
    path: string;
    region: string;
  };
  connection: {
    app: AppConnection.AWS;
    name: string;
    id: string;
  };
};
