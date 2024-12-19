import { z } from "zod";

import { AppConnection } from "@app/services/app-connection/app-connection-enums";
import { SecretSync } from "@app/services/secret-sync/secret-sync-enums";
import { BaseSecretSyncSchema } from "@app/services/secret-sync/secret-sync-schemas";

export const GitHubSyncSchema = BaseSecretSyncSchema.extend({
  destinationConfig: z.object({
    test: z.string()
    // TODO describes
    // TODO additional options
  })
});

export const GitHubSyncListItemSchema = z.object({
  name: z.literal("GitHub"),
  app: z.literal(AppConnection.GitHub),
  slug: z.literal(SecretSync.GitHub)
});
