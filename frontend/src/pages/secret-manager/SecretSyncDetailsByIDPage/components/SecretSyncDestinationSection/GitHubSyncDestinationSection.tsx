import { ReactNode } from "react";

import { SecretSyncLabel } from "@app/components/secret-syncs";
import { GitHubSyncScope, TGitHubSync } from "@app/hooks/api/secretSyncs/types/github-sync";

type Props = {
  secretSync: TGitHubSync;
};

export const GitHubSyncDestinationSection = ({ secretSync }: Props) => {
  const { destinationConfig } = secretSync;

  let Components: ReactNode;
  switch (destinationConfig.scope) {
    case GitHubSyncScope.Organization:
      return null;
    case GitHubSyncScope.Repository:
      Components = (
        <SecretSyncLabel label="Repository">
          {destinationConfig.owner}/{destinationConfig.repo}
        </SecretSyncLabel>
      );
      break;
    case GitHubSyncScope.RepositoryEnvironment:
    default:
      return null;
  }

  return (
    <>
      <SecretSyncLabel className="capitalize" label="Scope">
        {destinationConfig.scope.replace("-", " ")}
      </SecretSyncLabel>
      {Components}
    </>
  );
};
