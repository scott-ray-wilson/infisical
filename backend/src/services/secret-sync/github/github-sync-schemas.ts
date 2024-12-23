import { z } from "zod";

import { AppConnection } from "@app/services/app-connection/app-connection-enums";
import { SecretSync } from "@app/services/secret-sync/secret-sync-enums";
import {
  BaseSecretSyncSchema,
  GenericCreateSecretSyncFieldsSchema,
  GenericUpdateSecretSyncFieldsSchema
} from "@app/services/secret-sync/secret-sync-schemas";

const GitHubSyncDestinationConfigSchema = z.object({
  // TODO describes
  repoId: z.string()
  // TODO additional options
});

export const GitHubSyncSchema = BaseSecretSyncSchema.extend({
  destination: z.literal(SecretSync.GitHub),
  destinationConfig: GitHubSyncDestinationConfigSchema
});

export const CreateGitHubSyncSchema = GenericCreateSecretSyncFieldsSchema(SecretSync.GitHub).extend({
  destination: z.literal(SecretSync.GitHub),
  destinationConfig: GitHubSyncDestinationConfigSchema,
  syncOptions: z.object({}).nullish() // TODO
});

export const UpdateGitHubSyncSchema = GenericUpdateSecretSyncFieldsSchema(SecretSync.AWSParameterStore).extend({
  destinationConfig: GitHubSyncDestinationConfigSchema.optional(),
  syncOptions: z.object({}).nullish() // TODO
});

export const GitHubSyncListItemSchema = z.object({
  name: z.literal("GitHub"),
  app: z.literal(AppConnection.GitHub),
  slug: z.literal(SecretSync.GitHub)
});
