import { registerSyncSecretsEndpoints } from "@app/server/routes/v1/secret-sync-routers/secret-sync-endpoints";
import { CreateGitHubSyncSchema, GitHubSyncSchema, UpdateGitHubSyncSchema } from "@app/services/secret-sync/github";
import { SecretSync } from "@app/services/secret-sync/secret-sync-enums";

export const registerGitHubSyncRouter = async (server: FastifyZodProvider) =>
  registerSyncSecretsEndpoints({
    destination: SecretSync.GitHub,
    server,
    responseSchema: GitHubSyncSchema,
    createSchema: CreateGitHubSyncSchema,
    updateSchema: UpdateGitHubSyncSchema
  });
