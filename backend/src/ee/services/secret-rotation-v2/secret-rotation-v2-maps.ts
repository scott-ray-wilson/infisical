import { SecretRotation } from "@app/ee/services/secret-rotation-v2/secret-rotation-v2-enums";
import {
  TSecretRotationV2GeneratedCredentials,
  TSecretRotationV2WithConnection
} from "@app/ee/services/secret-rotation-v2/secret-rotation-v2-types";
import { sqlCredentialsRotationFactory } from "@app/ee/services/secret-rotation-v2/shared/sql-credentials";
import { AppConnection } from "@app/services/app-connection/app-connection-enums";

export const SECRET_ROTATION_NAME_MAP: Record<SecretRotation, string> = {
  [SecretRotation.PostgresCredentials]: "PostgreSQL Credentials",
  [SecretRotation.MsSqlCredentials]: "Microsoft SQL Sever Credentials"
};

export const SECRET_ROTATION_CONNECTION_MAP: Record<SecretRotation, AppConnection> = {
  [SecretRotation.PostgresCredentials]: AppConnection.Postgres,
  [SecretRotation.MsSqlCredentials]: AppConnection.MsSql
};

type TRotationFactory = (rotation: Pick<TSecretRotationV2WithConnection, "connection" | "parameters">) => {
  issue: () => Promise<TSecretRotationV2GeneratedCredentials[number]>;
  revoke: (generatedCredentials: TSecretRotationV2GeneratedCredentials[number]) => Promise<void>;
  rotate: (
    generatedCredentials: TSecretRotationV2GeneratedCredentials[number]
  ) => Promise<TSecretRotationV2GeneratedCredentials[number]>;
};

export const SECRET_ROTATION_FACTORY_MAP: Record<SecretRotation, TRotationFactory> = {
  [SecretRotation.PostgresCredentials]: sqlCredentialsRotationFactory,
  [SecretRotation.MsSqlCredentials]: sqlCredentialsRotationFactory
};
