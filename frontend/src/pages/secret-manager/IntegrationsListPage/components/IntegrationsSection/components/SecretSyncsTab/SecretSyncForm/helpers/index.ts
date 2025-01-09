import { TSecretSync } from "@app/hooks/api/secretSyncs";
import { SecretSync } from "@app/hooks/api/secretSyncs/enums";

import { TCreateSecretSyncForm } from "../schemas";

export const parseFormData = ({
  destination,
  connection,
  folder,
  destinationConfig,
  ...data
}: TCreateSecretSyncForm) => {
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
