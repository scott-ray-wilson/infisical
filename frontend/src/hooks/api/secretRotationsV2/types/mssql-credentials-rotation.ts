import { SecretRotation } from "@app/hooks/api/secretRotationsV2";
import {
  TSecretRotationV2Base,
  TSecretRotationV2GeneratedCredentialsResponseBase,
  TSqlCredentialsGeneratedCredentials,
  TSqlCredentialsRotationParameters
} from "@app/hooks/api/secretRotationsV2/types/shared";

export type TMsSqlCredentialsRotation = TSecretRotationV2Base & {
  type: SecretRotation.MsSqlCredentials;
  parameters: TSqlCredentialsRotationParameters;
};

export type TMsSqlCredentialsRotationGeneratedCredentialsResponse =
  TSecretRotationV2GeneratedCredentialsResponseBase<
    SecretRotation.MsSqlCredentials,
    TSqlCredentialsGeneratedCredentials
  >;
