import { TSecretSync } from "@app/hooks/api/secretSyncs";
import { SecretSync } from "@app/hooks/api/secretSyncs/enums";

import { TSecretSyncForm } from "../schemas";

export const parseFormData = ({
  destination,
  connection,
  environment,
  destinationConfig,
  ...data
}: TSecretSyncForm) => {
  let parsedConfig: TSecretSync["destinationConfig"];

  switch (destination) {
    case SecretSync.AWSParameterStore:
      parsedConfig = {
        ...destinationConfig,
        region: destinationConfig.region.slug
      };
      break;
    default:
      parsedConfig = destinationConfig;
  }

  return {
    destination,
    connectionId: connection.id,
    envId: environment.id,
    destinationConfig: parsedConfig,
    ...data
  };
};
