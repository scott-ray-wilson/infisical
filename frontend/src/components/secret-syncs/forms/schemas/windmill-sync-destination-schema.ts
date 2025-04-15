import { z } from "zod";

import { BaseSecretSyncSchema } from "@app/components/secret-syncs/forms/schemas/base-secret-sync-schema";
import { SecretSync } from "@app/hooks/api/secretSyncs";

export const WindmillSyncDestinationSchema = BaseSecretSyncSchema().merge(
  z.object({
    destination: z.literal(SecretSync.Windmill),
    destinationConfig: z.object({
      workspace: z.string().trim().min(1, "Project required"),
      path: z
        .string()
        .trim()
        .min(1, "Project required")
        .refine(
          (val) =>
            (val.startsWith("u/") || val.startsWith("f/")) &&
            val.endsWith("/") &&
            val.split("/").length === 3,
          'Invalid path - must follow Windmill path format. ex: "/f/user/path/"'
        )
    })
  })
);
