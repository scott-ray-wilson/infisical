import { TSecretSync } from "@app/hooks/api/secretSyncs";
import { SecretSync } from "@app/hooks/api/secretSyncs/enums.ts";

import { AwsParameterStoreDestinationCol } from "./AwsParameterStoreDestinationCol.tsx";

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
