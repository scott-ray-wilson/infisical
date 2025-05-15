import { z } from "zod";

import { TGitHubConnection } from "@app/services/app-connection/github";

import {
  CreateGitHubSecretScanningSourceSchema,
  GitHubSecretScanningSourceListItemSchema,
  GitHubSecretScanningSourceSchema
} from "./github-secret-scanning-schemas";

export type TGitHubSecretScanningSource = z.infer<typeof GitHubSecretScanningSourceSchema>;

export type TGitHubSecretScanningSourceInput = z.infer<typeof CreateGitHubSecretScanningSourceSchema>;

export type TGitHubSecretScanningSourceListItem = z.infer<typeof GitHubSecretScanningSourceListItemSchema>;

export type TGitHubSecretScanningSourceWithConnection = TGitHubSecretScanningSource & {
  connection: TGitHubConnection;
};
