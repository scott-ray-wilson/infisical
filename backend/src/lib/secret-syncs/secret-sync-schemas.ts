import { z } from "zod";

import { SecretSyncsSchema } from "@app/db/schemas/secret-syncs";

export const BaseSecretSyncSchema = SecretSyncsSchema.omit({
  destinationConfig: true,
  syncConfig: true
}).extend({
  syncConfig: z
    .object({
      // TODO
    })
    .nullish()
});
