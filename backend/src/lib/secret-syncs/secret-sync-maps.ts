import { SecretSync } from "@app/lib/secret-syncs/secret-sync-enums";

export const SECRET_SYNC_NAME_MAP: Record<SecretSync, string> = {
  [SecretSync.AWSParameterStore]: "AWS Parameter Store"
};
