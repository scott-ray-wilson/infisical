import { z } from "zod";

import { SecretScanningSource } from "@app/ee/services/secret-scanning-v2/secret-scanning-v2-enums";
import {
  BaseCreateSecretScanningSourceSchema,
  BaseSecretScanningSourceSchema,
  BaseUpdateSecretScanningSourceSchema
} from "@app/ee/services/secret-scanning-v2/secret-scanning-v2-schemas";
import { AppConnection } from "@app/services/app-connection/app-connection-enums";

export const GitLabSecretScanningSourceConfigSchema = z.object({
  includeRepos: z.array(z.string()).optional()
});

export const GitLabSecretScanningSourceSchema = BaseSecretScanningSourceSchema({
  type: SecretScanningSource.GitLab,
  isConnectionRequired: true
}).extend({
  config: GitLabSecretScanningSourceConfigSchema
});

export const CreateGitLabSecretScanningSourceSchema = BaseCreateSecretScanningSourceSchema({
  type: SecretScanningSource.GitLab,
  isConnectionRequired: true
}).extend({
  config: GitLabSecretScanningSourceConfigSchema
});

export const UpdateGitLabSecretScanningSourceSchema = BaseUpdateSecretScanningSourceSchema(
  SecretScanningSource.GitLab
).extend({
  config: GitLabSecretScanningSourceConfigSchema.optional()
});

export const GitLabSecretScanningSourceListItemSchema = z.object({
  name: z.literal("GitLab"),
  connection: z.literal(AppConnection.GitLab),
  type: z.literal(SecretScanningSource.GitLab)
});
