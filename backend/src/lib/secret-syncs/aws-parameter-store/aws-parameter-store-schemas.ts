import { z } from "zod";

import { BaseSecretSyncSchema } from "@app/lib/secret-syncs/secret-sync-schemas";

export const AwsParameterStoreSchema = BaseSecretSyncSchema.extend({
  destinationConfig: z.object({
    // TODO describes
    region: z.string(),
    path: z.string()
    // TODO additional options
  })
});
