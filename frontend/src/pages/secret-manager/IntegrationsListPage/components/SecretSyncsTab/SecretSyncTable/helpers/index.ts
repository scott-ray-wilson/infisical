import { SecretSync, TSecretSync } from "@app/hooks/api/secretSyncs";
import { GitHubSyncScope } from "@app/hooks/api/secretSyncs/types/github-sync";

export const getSecretSyncDestinationColValues = (secretSync: TSecretSync) => {
  let primaryText: string;
  let secondaryText: string | undefined;

  const { destination, destinationConfig } = secretSync;

  switch (destination) {
    case SecretSync.AWSParameterStore:
      primaryText = destinationConfig.path;
      secondaryText = destinationConfig.region;
      break;
    case SecretSync.GitHub:
      switch (destinationConfig.scope) {
        case GitHubSyncScope.Organization:
          break;
        case GitHubSyncScope.Repository:
          primaryText = `${destinationConfig.owner}/${destinationConfig.repo}`;
          secondaryText = "Repository";
          break;
        case GitHubSyncScope.RepositoryEnvironment:
          break;
      }
      break;
    default:
      throw new Error(`Unhandled Destination Col Values ${destination}`);
  }

  return {
    primaryText,
    secondaryText
  };
};
