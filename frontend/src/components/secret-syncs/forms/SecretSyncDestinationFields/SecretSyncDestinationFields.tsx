import { useFormContext } from "react-hook-form";

import { SecretSync } from "@app/hooks/api/secretSyncs/enums.ts";

import { TSecretSyncForm } from "../schemas";
import { AwsParameterStoreSyncFields } from "./AwsParameterStoreSyncFields";

export const SecretSyncDestinationFields = () => {
  const { watch } = useFormContext<TSecretSyncForm>();

  const destination = watch("destination");

  switch (destination) {
    case SecretSync.AWSParameterStore:
      return <AwsParameterStoreSyncFields />;
    default:
      throw new Error(`Unhandled Destination Config Field: ${destination}`);
  }
};
