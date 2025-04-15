import { z } from "zod";

import { SecretSyncs } from "@app/lib/api-docs";
import { AppConnection } from "@app/services/app-connection/app-connection-enums";
import { SecretSync } from "@app/services/secret-sync/secret-sync-enums";
import {
  BaseSecretSyncSchema,
  GenericCreateSecretSyncFieldsSchema,
  GenericUpdateSecretSyncFieldsSchema
} from "@app/services/secret-sync/secret-sync-schemas";
import { TSyncOptionsConfig } from "@app/services/secret-sync/secret-sync-types";

const WindmillSyncDestinationConfigSchema = z.object({
  workspace: z.string().trim().min(1, "Workspace required").describe(SecretSyncs.DESTINATION_CONFIG.WINDMILL.workspace),
  path: z
    .string()
    .trim()
    .min(1, "Workspace path required")
    .refine(
      (val) => (val.startsWith("u/") || val.startsWith("f/")) && val.endsWith("/") && val.split("/").length === 3,
      'Invalid path - must follow Windmill path format. ex: "/f/user/path/"'
    )
    .describe(SecretSyncs.DESTINATION_CONFIG.WINDMILL.path)
});

const WindmillSyncOptionsConfig: TSyncOptionsConfig = { canImportSecrets: false };

export const WindmillSyncSchema = BaseSecretSyncSchema(SecretSync.Windmill, WindmillSyncOptionsConfig).extend({
  destination: z.literal(SecretSync.Windmill),
  destinationConfig: WindmillSyncDestinationConfigSchema
});

export const CreateWindmillSyncSchema = GenericCreateSecretSyncFieldsSchema(
  SecretSync.Windmill,
  WindmillSyncOptionsConfig
).extend({
  destinationConfig: WindmillSyncDestinationConfigSchema
});

export const UpdateWindmillSyncSchema = GenericUpdateSecretSyncFieldsSchema(
  SecretSync.Windmill,
  WindmillSyncOptionsConfig
).extend({
  destinationConfig: WindmillSyncDestinationConfigSchema.optional()
});

export const WindmillSyncListItemSchema = z.object({
  name: z.literal("Windmill"),
  connection: z.literal(AppConnection.Windmill),
  destination: z.literal(SecretSync.Windmill),
  canImportSecrets: z.literal(true)
});
