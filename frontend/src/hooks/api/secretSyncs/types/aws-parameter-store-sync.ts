import { AppConnection } from "@app/hooks/api/appConnections/enums";
import { SecretSync } from "@app/hooks/api/secretSyncs";
import { TRootSecretSync } from "@app/hooks/api/secretSyncs/types/root-sync";

export type TAwsParameterStoreSync = TRootSecretSync & {
  destination: SecretSync.AWSParameterStore;
  destinationConfig: {
    path: string;
    region: string;
    keyId?: string;
    tags?: { key: string; value?: string }[];
    syncSecretMetadataAsTags?: boolean;
  };
  connection: {
    app: AppConnection.AWS;
    name: string;
    id: string;
  };
};
