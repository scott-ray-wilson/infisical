import { SecretSync } from "@app/services/secret-sync/secret-sync-enums";

export const SECRET_SYNC_NAME_MAP: Record<SecretSync, string> = {
  [SecretSync.AWSParameterStore]: "AWS Parameter Store",
  [SecretSync.GitHub]: "GitHub"
};
