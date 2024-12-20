import { z } from "zod";

import { SecretSyncsSchema } from "@app/db/schemas/secret-syncs";
import { SecretSyncs } from "@app/lib/api-docs";
import { slugSchema } from "@app/server/lib/schemas";
import { SecretSync } from "@app/services/secret-sync/secret-sync-enums";

export const BaseSecretSyncSchema = SecretSyncsSchema.omit({
  destinationConfig: true,
  syncConfig: true
}).extend({
  syncConfig: z.object({
    // TODO
  })
});

export const GenericCreateSecretSyncFieldsSchema = (sync: SecretSync) =>
  z.object({
    name: slugSchema({ field: "name" }).describe(SecretSyncs.CREATE(sync).name),
    description: z
      .string()
      .trim()
      .max(256, "Description cannot exceed 256 characters")
      .nullish()
      .describe(SecretSyncs.CREATE(sync).description)
  });

export const GenericUpdateSecretSyncFieldsSchema = (sync: SecretSync) =>
  z.object({
    name: slugSchema({ field: "name" }).describe(SecretSyncs.UPDATE(sync).name).optional(),
    description: z
      .string()
      .trim()
      .max(256, "Description cannot exceed 256 characters")
      .nullish()
      .describe(SecretSyncs.UPDATE(sync).description)
  });
