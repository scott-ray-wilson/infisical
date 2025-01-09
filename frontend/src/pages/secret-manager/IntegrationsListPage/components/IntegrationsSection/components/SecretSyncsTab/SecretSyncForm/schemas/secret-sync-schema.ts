import { z } from "zod";

import { slugSchema } from "@app/lib/schemas";

import { AwsParameterStoreConfigSchema } from "./aws-parameter-store-config-schema";

const BaseSecretSyncSchema = z.object({
  name: slugSchema({ field: "Name" }),
  description: z.string().trim().optional(),
  connection: z.object({ name: z.string(), id: z.string().uuid() }),
  folder: z.object({ name: z.string(), id: z.string().uuid(), slug: z.string() }),
  secretPath: z.string().trim().min(1, "Required"),
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
  })
});

// TODO: union once more supported
export const CreateSecretSyncFormSchema = AwsParameterStoreConfigSchema.and(BaseSecretSyncSchema);

export type TCreateSecretSyncForm = z.infer<typeof CreateSecretSyncFormSchema>;
