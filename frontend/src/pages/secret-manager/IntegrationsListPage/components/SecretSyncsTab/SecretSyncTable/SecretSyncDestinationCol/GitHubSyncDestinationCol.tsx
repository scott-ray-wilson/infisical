import { Td, Tooltip } from "@app/components/v2";
import { GitHubSyncScope, TGitHubSync } from "@app/hooks/api/secretSyncs/types/github-sync";

type Props = {
  secretSync: TGitHubSync;
};

export const GitHubSyncDestinationCol = ({ secretSync }: Props) => {
  const config = secretSync.destinationConfig;

  switch (config.scope) {
    case GitHubSyncScope.Organization:
      return null;
    case GitHubSyncScope.Repository:
      return (
        <Td>
          <Tooltip
            side="left"
            className="max-w-2xl break-words"
            content={`${config.owner}/${config.repo}`}
          >
            <p className="truncate text-sm">{`${config.owner}/${config.repo}`}</p>
          </Tooltip>
        </Td>
      );
    case GitHubSyncScope.RepositoryEnvironment:
    default:
      return null;
  }
};
