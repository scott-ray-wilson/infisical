import { z } from "zod";

import { AppConnection } from "@app/services/app-connection/app-connection-enums";
import { SecretSync } from "@app/services/secret-sync/secret-sync-enums";
import {
  BaseSecretSyncSchema,
  GenericCreateSecretSyncFieldsSchema,
  GenericUpdateSecretSyncFieldsSchema
} from "@app/services/secret-sync/secret-sync-schemas";

const GitHubSyncDestinationConfigSchema = z.object({
  repoId: z.string()
});

export const GitHubSyncSchema = BaseSecretSyncSchema(SecretSync.GitHub).extend({
  destination: z.literal(SecretSync.GitHub),
  destinationConfig: GitHubSyncDestinationConfigSchema
});

export const CreateGitHubSyncSchema = GenericCreateSecretSyncFieldsSchema(SecretSync.GitHub).extend({
  destinationConfig: GitHubSyncDestinationConfigSchema
});

export const UpdateGitHubSyncSchema = GenericUpdateSecretSyncFieldsSchema(SecretSync.GitHub).extend({
  destinationConfig: GitHubSyncDestinationConfigSchema.optional()
});

export const GitHubSyncListItemSchema = z.object({
  name: z.literal("GitHub"),
  connection: z.literal(AppConnection.GitHub),
  destination: z.literal(SecretSync.GitHub),
  canImportSecrets: z.literal(false)
});
