import { AppConnection } from "@app/lib/app-connections";
import { SecretSync, TSecretSyncListItem } from "@app/lib/secret-syncs";

export const AWS_PARAMETER_STORE_LIST_OPTION: TSecretSyncListItem = {
  name: "AWS Parameter Store",
  slug: SecretSync.AWSParameterStore,
  app: AppConnection.AWS
};
