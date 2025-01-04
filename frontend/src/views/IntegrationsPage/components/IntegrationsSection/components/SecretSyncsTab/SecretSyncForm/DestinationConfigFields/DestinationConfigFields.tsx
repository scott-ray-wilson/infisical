import { useFormContext } from "react-hook-form";

import { SecretSync } from "@app/hooks/api/secretSyncs/enums";

import { TSecretSyncForm } from "../schemas";
import { AwsParameterStoreConfigFields } from "./AwsParameterStoreConfigFields";

export const DestinationConfigFields = () => {
  const { watch } = useFormContext<TSecretSyncForm>();

  const destination = watch("destination");

  switch (destination) {
    case SecretSync.AWSParameterStore:
      return <AwsParameterStoreConfigFields />;
    default:
      throw new Error(`Unhandled Destination Config Field: ${destination}`);
  }
};
