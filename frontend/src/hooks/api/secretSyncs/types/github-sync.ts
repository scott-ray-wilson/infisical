import { AppConnection } from "@app/hooks/api/appConnections/enums";
import { SecretSync } from "@app/hooks/api/secretSyncs/enums";
import { TRootSecretSync } from "@app/hooks/api/secretSyncs/types/root-connection";

export type TGitHubSync = TRootSecretSync & {
  destination: SecretSync.GitHub;
  connection: {
    app: AppConnection.GitHub;
    name: string;
    id: string;
  };
};
