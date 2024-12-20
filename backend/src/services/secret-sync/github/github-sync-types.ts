import { z } from "zod";

import { CreateGitHubSyncSchema, GitHubSyncListItemSchema, GitHubSyncSchema } from "./github-sync-schemas";

export type TGitHubSync = z.infer<typeof GitHubSyncSchema>;

export type TGitHubSyncInput = z.infer<typeof CreateGitHubSyncSchema>;

export type TGitHubSyncListItem = z.infer<typeof GitHubSyncListItemSchema>;
