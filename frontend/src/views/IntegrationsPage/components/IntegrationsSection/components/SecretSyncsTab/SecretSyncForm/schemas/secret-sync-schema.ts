import { z } from "zod";

import { slugSchema } from "@app/lib/schemas";

import { AwsParameterStoreConfigSchema } from "./aws-parameter-store-config-schema";
import { GithubConfigSchema } from "./github-config-schema";

const BaseSecretSyncSchema = z.object({
  name: slugSchema({ field: "Name" }),
  description: z.string().trim().optional(),
  connection: z.object({ name: z.string(), id: z.string().uuid() }),
  environment: z.object({ name: z.string(), id: z.string().uuid(), slug: z.string() }),
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

export const CreateSecretSyncFormSchema = z
  .discriminatedUnion("destination", [AwsParameterStoreConfigSchema, GithubConfigSchema])
  .and(BaseSecretSyncSchema);

export type TCreateSecretSyncForm = z.infer<typeof CreateSecretSyncFormSchema>;
