import { SecretSync } from "@app/hooks/api/secretSyncs/enums";

export const SECRET_SYNC_MAP: Record<SecretSync, { name: string; image: string }> = {
  [SecretSync.AWSParameterStore]: { name: "AWS", image: "Amazon Web Services.png" },
  [SecretSync.GitHub]: { name: "GitHub", image: "GitHub.png" }
};
