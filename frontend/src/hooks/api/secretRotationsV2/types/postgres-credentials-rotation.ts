import { SecretRotation } from "@app/hooks/api/secretRotationsV2";
import {
  TSecretRotationBase,
  TSqlCredentialsRotationParameters
} from "@app/hooks/api/secretRotationsV2/types/shared";

export type TPostgresCredentialsRotation = TSecretRotationBase & {
  type: SecretRotation.PostgresCredentials;
  parameters: TSqlCredentialsRotationParameters;
};
