import { z } from "zod";

import { TGitHubConnection } from "@app/services/app-connection/github";

import {
  CreateGitHubDataSourceSchema,
  GitHubDataSourceListItemSchema,
  GitHubDataSourceSchema,
  GitHubFindingSchema
} from "./github-secret-scanning-schemas";

export type TGitHubDataSource = z.infer<typeof GitHubDataSourceSchema>;

export type TGitHubDataSourceInput = z.infer<typeof CreateGitHubDataSourceSchema>;

export type TGitHubDataSourceListItem = z.infer<typeof GitHubDataSourceListItemSchema>;

export type TGitHubFinding = z.infer<typeof GitHubFindingSchema>;

export type TGitHubDataSourceWithConnection = TGitHubDataSource & {
  connection: TGitHubConnection;
};
