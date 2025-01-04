import { AppConnection } from "@app/hooks/api/appConnections/enums";
import { SecretSync } from "@app/hooks/api/secretSyncs/enums";
import { TRootSecretSync } from "@app/hooks/api/secretSyncs/types/root-connection";

// TODO:

export type TGitHubSync = TRootSecretSync & {
  destination: SecretSync.GitHub;
  destinationConfig: {
    repoId: string;
  };
  connection: {
    app: AppConnection.GitHub;
    name: string;
    id: string;
  };
};
