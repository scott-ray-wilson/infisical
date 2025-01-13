import { SecretSync, TSecretSync } from "@app/hooks/api/secretSyncs";

import { AwsParameterStoreDestinationCol } from "./AwsParameterStoreDestinationCol";

type Props = {
  secretSync: TSecretSync;
};

export const SecretSyncDestinationCol = ({ secretSync }: Props) => {
  switch (secretSync.destination) {
    case SecretSync.AWSParameterStore:
      return <AwsParameterStoreDestinationCol secretSync={secretSync} />;
    default:
      throw new Error(`Unhandled Sync Destination Col ${secretSync.destination}`);
  }
};
