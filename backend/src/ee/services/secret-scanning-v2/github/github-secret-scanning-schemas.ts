import { z } from "zod";

import { SecretScanningSource } from "@app/ee/services/secret-scanning-v2/secret-scanning-v2-enums";
import {
  BaseCreateSecretScanningSourceSchema,
  BaseSecretScanningSourceSchema,
  BaseUpdateSecretScanningSourceSchema
} from "@app/ee/services/secret-scanning-v2/secret-scanning-v2-schemas";
import { AppConnection } from "@app/services/app-connection/app-connection-enums";

export const GitHubSecretScanningSourceConfigSchema = z.object({
  includeRepos: z.array(z.string()).optional()
});

export const GitHubSecretScanningSourceSchema = BaseSecretScanningSourceSchema({
  type: SecretScanningSource.GitHub,
  isConnectionRequired: true
}).extend({
  config: GitHubSecretScanningSourceConfigSchema
});

export const CreateGitHubSecretScanningSourceSchema = BaseCreateSecretScanningSourceSchema({
  type: SecretScanningSource.GitHub,
  isConnectionRequired: true
}).extend({
  config: GitHubSecretScanningSourceConfigSchema
});

export const UpdateGitHubSecretScanningSourceSchema = BaseUpdateSecretScanningSourceSchema(
  SecretScanningSource.GitHub
).extend({
  config: GitHubSecretScanningSourceConfigSchema.optional()
});

export const GitHubSecretScanningSourceListItemSchema = z.object({
  name: z.literal("GitHub"),
  connection: z.literal(AppConnection.GitHub),
  type: z.literal(SecretScanningSource.GitHub)
});
