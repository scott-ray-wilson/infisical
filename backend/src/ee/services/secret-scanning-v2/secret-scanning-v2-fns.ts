import { GITHUB_SECRET_SCANNING_LIST_OPTION } from "@app/ee/services/secret-scanning-v2/github";
import { GITLAB_SECRET_SCANNING_LIST_OPTION } from "@app/ee/services/secret-scanning-v2/gitlab";

import { SecretScanningSource } from "./secret-scanning-v2-enums";
import { TSecretScanningSourceListItem } from "./secret-scanning-v2-types";

const SECRET_SCANNING_SOURCE_LIST_OPTIONS: Record<SecretScanningSource, TSecretScanningSourceListItem> = {
  [SecretScanningSource.GitHub]: GITHUB_SECRET_SCANNING_LIST_OPTION,
  [SecretScanningSource.GitLab]: GITLAB_SECRET_SCANNING_LIST_OPTION
};

export const listSecretScanningSourceOptions = () => {
  return Object.values(SECRET_SCANNING_SOURCE_LIST_OPTIONS).sort((a, b) => a.name.localeCompare(b.name));
};

// export const parseRotationErrorMessage = (err: unknown): string => {
//   let errorMessage = `Infisical encountered an issue while generating credentials with the configured inputs: `;
//
//   if (err instanceof AxiosError) {
//     errorMessage += err?.response?.data
//       ? JSON.stringify(err?.response?.data)
//       : (err?.message ?? "An unknown error occurred.");
//   } else {
//     errorMessage += (err as Error)?.message || "An unknown error occurred.";
//   }
//
//   return errorMessage.length <= MAX_MESSAGE_LENGTH
//     ? errorMessage
//     : `${errorMessage.substring(0, MAX_MESSAGE_LENGTH - 3)}...`;
// };
