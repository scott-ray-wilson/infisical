import { z } from "zod";

import { SecretSync } from "@app/hooks/api/secretSyncs/enums";

export const GithubConfigSchema = z.object({
  destination: z.literal(SecretSync.GitHub),
  destinationConfig: z.object({ repoId: z.string() })
});
