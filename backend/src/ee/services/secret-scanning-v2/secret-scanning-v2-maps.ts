import { SecretScanningSource } from "@app/ee/services/secret-scanning-v2/secret-scanning-v2-enums";
import { AppConnection } from "@app/services/app-connection/app-connection-enums";

export const SECRET_SCANNING_SOURCE_NAME_MAP: Record<SecretScanningSource, string> = {
  [SecretScanningSource.GitHub]: "GitHub",
  [SecretScanningSource.GitLab]: "GitLab"
};

export const SECRET_SCANNING_SOURCE_CONNECTION_MAP: Record<SecretScanningSource, AppConnection> = {
  [SecretScanningSource.GitHub]: AppConnection.GitHub,
  [SecretScanningSource.GitLab]: AppConnection.GitLab
};
