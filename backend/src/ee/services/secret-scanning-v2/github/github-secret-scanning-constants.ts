import { SecretScanningSource } from "@app/ee/services/secret-scanning-v2/secret-scanning-v2-enums";
import { TSecretScanningSourceListItem } from "@app/ee/services/secret-scanning-v2/secret-scanning-v2-types";
import { AppConnection } from "@app/services/app-connection/app-connection-enums";

export const GITHUB_SECRET_SCANNING_LIST_OPTION: TSecretScanningSourceListItem = {
  name: "GitHub",
  type: SecretScanningSource.GitHub,
  connection: AppConnection.GitHub
};
