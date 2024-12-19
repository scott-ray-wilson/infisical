import { z } from "zod";

import { AppConnection } from "@app/services/app-connection/app-connection-enums";
import { SecretSync } from "@app/services/secret-sync/secret-sync-enums";
import { BaseSecretSyncSchema } from "@app/services/secret-sync/secret-sync-schemas";

export const AwsParameterStoreSyncSchema = BaseSecretSyncSchema.extend({
  destinationConfig: z.object({
    // TODO describes
    service: z.literal(SecretSync.AWSParameterStore), // needed to differentiate between other aws services, ie Secrets Manager
    region: z.string(),
    path: z.string()
    // TODO additional options
  })
});

export const AwsParameterStoreSyncListItemSchema = z.object({
  name: z.literal("AWS Parameter Store"),
  app: z.literal(AppConnection.AWS),
  slug: z.literal(SecretSync.AWSParameterStore)
});
