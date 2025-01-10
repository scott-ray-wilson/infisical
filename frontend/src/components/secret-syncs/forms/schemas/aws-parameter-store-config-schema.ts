import { z } from "zod";

import { SecretSync } from "@app/hooks/api/secretSyncs/enums.ts";

export const AwsParameterStoreConfigSchema = z.object({
  destination: z.literal(SecretSync.AWSParameterStore),
  destinationConfig: z.object({
    path: z.string(),
    region: z.object({ name: z.string(), slug: z.string() })
  })
});
