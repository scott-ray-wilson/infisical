import { registerAwsParameterStoreSyncRouter } from "@app/server/routes/v1/secret-sync-routers/aws-parameter-store-sync-router";
import { registerGitHubSyncRouter } from "@app/server/routes/v1/secret-sync-routers/github-sync-router";
import { SecretSync } from "@app/services/secret-sync/secret-sync-enums";

export * from "./secret-sync-router";

export const SECRET_SYNC_REGISTER_ROUTER_MAP: Record<SecretSync, (server: FastifyZodProvider) => Promise<void>> = {
  [SecretSync.AWSParameterStore]: registerAwsParameterStoreSyncRouter,
  [SecretSync.GitHub]: registerGitHubSyncRouter
};
