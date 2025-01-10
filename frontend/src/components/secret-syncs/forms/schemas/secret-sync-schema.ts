import { z } from "zod";

import { slugSchema } from "@app/lib/schemas";

import { AwsParameterStoreConfigSchema } from "./aws-parameter-store-config-schema";

const BaseSecretSyncSchema = z.object({
  name: slugSchema({ field: "Name" }),
  description: z.string().trim().optional(),
  connection: z.object({ name: z.string(), id: z.string().uuid() }),
  folder: z.object({ path: z.string(), id: z.string() }),
  syncOptions: z.object({
    prependPrefix: z
      .string()
      .trim()
      .transform((str) => str.toUpperCase())
      .optional(),
    appendSuffix: z
      .string()
      .trim()
      .transform((str) => str.toUpperCase())
      .optional()
  }),
  isEnabled: z.boolean()
});

// TODO: union once more supported
export const SecretSyncFormSchema = AwsParameterStoreConfigSchema.and(BaseSecretSyncSchema);

export type TSecretSyncForm = z.infer<typeof SecretSyncFormSchema>;
