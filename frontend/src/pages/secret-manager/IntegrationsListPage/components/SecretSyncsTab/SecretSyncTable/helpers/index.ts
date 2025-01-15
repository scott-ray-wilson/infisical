import { SecretSync, TSecretSync } from "@app/hooks/api/secretSyncs";
import { GitHubSyncScope } from "@app/hooks/api/secretSyncs/types/github-sync";

// This functional ensures parity across what is displayed in the destination column
// and the values used when search filtering
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
          primaryText = destinationConfig.org;
          secondaryText = `Organization - Visibility ${destinationConfig.visibility}`;
          break;
        case GitHubSyncScope.Repository:
          primaryText = `${destinationConfig.owner}/${destinationConfig.repo}`;
          secondaryText = "Repository";
          break;
        case GitHubSyncScope.RepositoryEnvironment:
          primaryText = `${destinationConfig.owner}/${destinationConfig.repo}`;
          secondaryText = `Environment: ${destinationConfig.env}`;
          break;
        default:
          throw new Error(`Unhandled GitHub Scope Destination Col Values ${destination}`);
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
