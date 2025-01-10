import { AWS_REGIONS } from "@app/helpers/appConnections";
import { TSecretSync } from "@app/hooks/api/secretSyncs";
import { SecretSync } from "@app/hooks/api/secretSyncs/enums";

import { TSecretSyncForm } from "../schemas";

export const parseFormData = ({
  destination,
  connection,
  folder,
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
      throw new Error("Unhandled Destination configuration");
  }

  return {
    destination,
    connectionId: connection.id,
    folderId: folder.id,
    destinationConfig: parsedConfig,
    ...data
  };
};

export const formatFormData = ({
  destination,
  connection,
  folder,
  destinationConfig,
  description,
  ...data
}: TSecretSync) => {
  let parsedConfig: TSecretSyncForm["destinationConfig"];

  switch (destination) {
    case SecretSync.AWSParameterStore:
      parsedConfig = {
        ...destinationConfig,
        region: AWS_REGIONS.find((r) => r.slug === destinationConfig.region)!
      };
      break;
    default:
      throw new Error("Unhandled Destination configuration");
  }

  return {
    description: description ?? "",
    destination,
    connection,
    folder,
    destinationConfig: parsedConfig,
    ...data
  };
};
