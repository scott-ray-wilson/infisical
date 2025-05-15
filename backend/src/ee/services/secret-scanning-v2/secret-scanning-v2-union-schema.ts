import { z } from "zod";

import { GitHubSecretScanningSourceSchema } from "@app/ee/services/secret-scanning-v2/github";
import { GitLabSecretScanningSourceSchema } from "@app/ee/services/secret-scanning-v2/gitlab";

export const SecretScanningSourceSchema = z.discriminatedUnion("type", [
  GitHubSecretScanningSourceSchema,
  GitLabSecretScanningSourceSchema
]);
