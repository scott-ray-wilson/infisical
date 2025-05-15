import { SecretScanningSource } from "@app/ee/services/secret-scanning-v2/secret-scanning-v2-enums";
import { TSecretScanningSourceListItem } from "@app/ee/services/secret-scanning-v2/secret-scanning-v2-types";
import { AppConnection } from "@app/services/app-connection/app-connection-enums";

export const GITLAB_SECRET_SCANNING_LIST_OPTION: TSecretScanningSourceListItem = {
  name: "GitLab",
  type: SecretScanningSource.GitLab,
  connection: AppConnection.GitLab
};
