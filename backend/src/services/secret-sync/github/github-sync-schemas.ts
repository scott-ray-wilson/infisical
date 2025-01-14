import { z } from "zod";

import { AppConnection } from "@app/services/app-connection/app-connection-enums";
import { SecretSync } from "@app/services/secret-sync/secret-sync-enums";
import {
  BaseSecretSyncSchema,
  GenericCreateSecretSyncFieldsSchema,
  GenericUpdateSecretSyncFieldsSchema
} from "@app/services/secret-sync/secret-sync-schemas";
import { TSyncOptionsConfig } from "@app/services/secret-sync/secret-sync-types";

const GitHubSyncDestinationConfigSchema = z.object({
  repoId: z.string()
});

const GitHubSyncOptionsConfig: TSyncOptionsConfig = { canImportSecrets: false };

export const GitHubSyncSchema = BaseSecretSyncSchema(SecretSync.GitHub, GitHubSyncOptionsConfig).extend({
  destination: z.literal(SecretSync.GitHub),
  destinationConfig: GitHubSyncDestinationConfigSchema
});

export const CreateGitHubSyncSchema = GenericCreateSecretSyncFieldsSchema(
  SecretSync.GitHub,
  GitHubSyncOptionsConfig
).extend({
  destinationConfig: GitHubSyncDestinationConfigSchema
});

export const UpdateGitHubSyncSchema = GenericUpdateSecretSyncFieldsSchema(
  SecretSync.GitHub,
  GitHubSyncOptionsConfig
).extend({
  destinationConfig: GitHubSyncDestinationConfigSchema.optional()
});

export const GitHubSyncListItemSchema = z.object({
  name: z.literal("GitHub"),
  connection: z.literal(AppConnection.GitHub),
  destination: z.literal(SecretSync.GitHub),
  canImportSecrets: z.literal(false)
});
