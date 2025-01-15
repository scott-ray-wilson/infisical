import { useFormContext } from "react-hook-form";

import { SecretSync } from "@app/hooks/api/secretSyncs";

import { TSecretSyncForm } from "../schemas";
import { AwsParameterStoreSyncFields } from "./AwsParameterStoreSyncFields";
import { GitHubSyncFields } from "./GitHubSyncFields";

type Props = {
  isUpdate?: boolean;
};

export const SecretSyncDestinationFields = ({ isUpdate }: Props) => {
  const { watch } = useFormContext<TSecretSyncForm>();

  const destination = watch("destination");

  switch (destination) {
    case SecretSync.AWSParameterStore:
      return <AwsParameterStoreSyncFields isUpdate={isUpdate} />;
    case SecretSync.GitHub:
      return <GitHubSyncFields isUpdate={isUpdate} />;
    default:
      throw new Error(`Unhandled Destination Config Field: ${destination}`);
  }
};
