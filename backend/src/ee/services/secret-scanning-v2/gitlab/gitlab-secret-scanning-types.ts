import { z } from "zod";

import { TGitLabConnection } from "@app/services/app-connection/gitlab";

import {
  CreateGitLabSecretScanningSourceSchema,
  GitLabSecretScanningSourceListItemSchema,
  GitLabSecretScanningSourceSchema
} from "./gitlab-secret-scanning-schemas";

export type TGitLabSecretScanningSource = z.infer<typeof GitLabSecretScanningSourceSchema>;

export type TGitLabSecretScanningSourceInput = z.infer<typeof CreateGitLabSecretScanningSourceSchema>;

export type TGitLabSecretScanningSourceListItem = z.infer<typeof GitLabSecretScanningSourceListItemSchema>;

export type TGitLabSecretScanningSourceWithConnection = TGitLabSecretScanningSource & {
  connection: TGitLabConnection;
};
