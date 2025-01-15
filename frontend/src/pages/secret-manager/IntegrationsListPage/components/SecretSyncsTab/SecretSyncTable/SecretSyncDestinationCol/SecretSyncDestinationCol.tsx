import { SecretSync, TSecretSync } from "@app/hooks/api/secretSyncs";
import { AwsParameterStoreSyncDestinationCol } from "@app/pages/secret-manager/IntegrationsListPage/components/SecretSyncsTab/SecretSyncTable/SecretSyncDestinationCol/AwsParameterStoreSyncDestinationCol";
import { GitHubSyncDestinationCol } from "@app/pages/secret-manager/IntegrationsListPage/components/SecretSyncsTab/SecretSyncTable/SecretSyncDestinationCol/GitHubSyncDestinationCol";

type Props = {
  secretSync: TSecretSync;
};

export const SecretSyncDestinationCol = ({ secretSync }: Props) => {
  switch (secretSync.destination) {
    case SecretSync.AWSParameterStore:
      return <AwsParameterStoreSyncDestinationCol secretSync={secretSync} />;
    case SecretSync.GitHub:
      return <GitHubSyncDestinationCol secretSync={secretSync} />;
    default:
      throw new Error(
        `Unhandled Secret Sync Destination Col: ${(secretSync as TSecretSync).destination}`
      );
  }
};
