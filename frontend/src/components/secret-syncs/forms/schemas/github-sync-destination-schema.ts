import { z } from "zod";

import { SecretSync } from "@app/hooks/api/secretSyncs";
import {
  GitHubSyncScope,
  GitHubSyncVisibility
} from "@app/hooks/api/secretSyncs/types/github-sync";

export const GitHubSyncDestinationSchema = z.object({
  destination: z.literal(SecretSync.GitHub),
  destinationConfig: z
    .discriminatedUnion("scope", [
      z.object({
        scope: z.literal(GitHubSyncScope.Organization),
        org: z.string().min(1, "Organization name required"),
        visibility: z.nativeEnum(GitHubSyncVisibility),
        selectedRepositoryIds: z.number().array().optional()
      }),
      z.object({
        scope: z.literal(GitHubSyncScope.Repository),
        owner: z.string().min(1, "Repository owner name required"),
        repo: z.string().min(1, "Repository name required")
      }),
      z.object({
        scope: z.literal(GitHubSyncScope.Environment),
        owner: z.string().min(1, "Repository owner name required"),
        repo: z.string().min(1, "Repository name required"),
        env: z.string().min(1, "Environment name required")
      })
    ])
    .superRefine((options, ctx) => {
      if (options.scope !== GitHubSyncScope.Organization) return;

      if (options.visibility === GitHubSyncVisibility.Selected && !options.selectedRepositoryIds) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Selected repository IDs required for visibility "Select"',
          path: ["selected_repository_ids"]
        });
        return;
      }

      if (options.selectedRepositoryIds) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Selected repository IDs are only configurable for visibility "Select"',
          path: ["selected_repository_ids"]
        });
      }
    })
});
