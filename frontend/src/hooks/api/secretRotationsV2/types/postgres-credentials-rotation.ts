import { SecretRotation } from "@app/hooks/api/secretRotationsV2";
import {
  TSecretRotationV2Base,
  TSecretRotationV2GeneratedCredentialsResponseBase,
  TSqlCredentialsGeneratedCredentials,
  TSqlCredentialsRotationParameters
} from "@app/hooks/api/secretRotationsV2/types/shared";

export type TPostgresCredentialsRotation = TSecretRotationV2Base & {
  type: SecretRotation.PostgresCredentials;
  parameters: TSqlCredentialsRotationParameters;
};

export type TPostgresCredentialsRotationGeneratedCredentialsResponse =
  TSecretRotationV2GeneratedCredentialsResponseBase<
    SecretRotation.PostgresCredentials,
    TSqlCredentialsGeneratedCredentials
  >;
