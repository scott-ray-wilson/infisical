import { z } from "zod";

import { GitHubSyncListItemSchema, GitHubSyncSchema } from "@app/services/secret-sync/github/github-sync-schemas";

export type TGitHubSync = z.infer<typeof GitHubSyncSchema>;

export type TGitHubSyncListItem = z.infer<typeof GitHubSyncListItemSchema>;
