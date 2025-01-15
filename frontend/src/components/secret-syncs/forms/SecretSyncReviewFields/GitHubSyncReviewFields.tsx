import { ReactNode } from "react";
import { useFormContext } from "react-hook-form";

import { SecretSyncLabel } from "@app/components/secret-syncs";
import { TSecretSyncForm } from "@app/components/secret-syncs/forms/schemas";
import { SecretSync } from "@app/hooks/api/secretSyncs";
import { GitHubSyncScope } from "@app/hooks/api/secretSyncs/types/github-sync";

export const GitHubSyncReviewFields = () => {
  const { watch } = useFormContext<TSecretSyncForm & { destination: SecretSync.GitHub }>();

  const config = watch("destinationConfig");

  let ScopeComponents: ReactNode;

  switch (config.scope) {
    case GitHubSyncScope.Repository:
      ScopeComponents = (
        <SecretSyncLabel label="Repository">
          {config.owner}/{config.repo}
        </SecretSyncLabel>
      );
      break;
    case GitHubSyncScope.Organization:
      ScopeComponents = (
        <>
          <SecretSyncLabel label="Organization">{config.org}</SecretSyncLabel>
          <SecretSyncLabel className="capitalize" label="Visibility">
            {config.visibility}
          </SecretSyncLabel>
        </>
      );
      break;
    case GitHubSyncScope.RepositoryEnvironment:
    default:
      ScopeComponents = null;
      break;
  }

  return (
    <>
      <SecretSyncLabel className="capitalize" label="Scope">
        {config.scope.replace("-", " ")}
      </SecretSyncLabel>
      {ScopeComponents}
    </>
  );
};
