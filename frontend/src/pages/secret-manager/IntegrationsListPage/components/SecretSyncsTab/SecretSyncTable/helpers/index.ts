import { TSecretSync } from "@app/hooks/api/secretSyncs";
import { SecretSync } from "@app/hooks/api/secretSyncs/enums";

export const getSecretSyncDestinationColValues = (secretSync: TSecretSync) => {
  let primaryText: string;
  let secondaryText: string;

  const { destination, destinationConfig } = secretSync;

  switch (destination) {
    case SecretSync.AWSParameterStore:
      primaryText = destinationConfig.path;
      secondaryText = destinationConfig.region;
      break;
    default:
      throw new Error(`Unhandled Destination Col Values ${destination}`);
  }

  return {
    primaryText,
    secondaryText
  };
};
