import { z } from "zod";

import { SecretSyncsSchema } from "@app/db/schemas/secret-syncs";
import { SecretSyncs } from "@app/lib/api-docs";
import { removeTrailingSlash } from "@app/lib/fn";
import { slugSchema } from "@app/server/lib/schemas";
import { AppConnection } from "@app/services/app-connection/app-connection-enums";
import { SecretSync } from "@app/services/secret-sync/secret-sync-enums";

export const BaseSecretSyncSchema = SecretSyncsSchema.omit({
  destination: true,
  destinationConfig: true,
  syncOptions: true
}).extend({
  syncOptions: z
    .object({
      // TODO
    })
    .nullish(),
  // join properties
  projectId: z.string(),
  connection: z.object({ app: z.nativeEnum(AppConnection), name: z.string(), id: z.string().uuid() }),
  environment: z.object({ slug: z.string(), name: z.string(), id: z.string().uuid() })
});

export const GenericCreateSecretSyncFieldsSchema = (sync: SecretSync) =>
  z.object({
    name: slugSchema({ field: "name" }).describe(SecretSyncs.CREATE(sync).name),
    description: z
      .string()
      .trim()
      .max(256, "Description cannot exceed 256 characters")
      .nullish()
      .describe(SecretSyncs.CREATE(sync).description),
    connectionId: z.string().uuid().describe(SecretSyncs.CREATE(sync).connectionId),
    envId: z.string().uuid().describe(SecretSyncs.CREATE(sync).envId),
    secretPath: z
      .string()
      .trim()
      .min(1, "Secret path required")
      .transform(removeTrailingSlash)
      .describe(SecretSyncs.CREATE(sync).secretPath),
    isEnabled: z.boolean().default(true).describe(SecretSyncs.CREATE(sync).isEnabled)
  });

export const GenericUpdateSecretSyncFieldsSchema = (sync: SecretSync) =>
  z.object({
    name: slugSchema({ field: "name" }).describe(SecretSyncs.UPDATE(sync).name).optional(),
    description: z
      .string()
      .trim()
      .max(256, "Description cannot exceed 256 characters")
      .nullish()
      .describe(SecretSyncs.UPDATE(sync).description),
    envId: z.string().uuid().describe(SecretSyncs.UPDATE(sync).envId),
    secretPath: z
      .string()
      .trim()
      .min(1, "Secret path required")
      .transform(removeTrailingSlash)
      .describe(SecretSyncs.UPDATE(sync).secretPath),
    isEnabled: z.boolean().default(true).describe(SecretSyncs.UPDATE(sync).isEnabled)
  });
