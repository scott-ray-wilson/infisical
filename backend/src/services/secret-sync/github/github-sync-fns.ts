import { TSecretMap } from "@app/services/secret-sync/secret-sync-types";

import { TGitHubSyncWithCredentials } from "./github-sync-types";

export const GithubSyncFns = {
  syncSecrets: async (secretSync: TGitHubSyncWithCredentials, secrets: TSecretMap) => {},
  importSecrets: async (secretSync: TGitHubSyncWithCredentials): Promise<TSecretMap> => {},
  removeSecrets: async (secretSync: TGitHubSyncWithCredentials, secrets: TSecretMap) => {}
};
