import { AppConnection } from "@app/hooks/api/appConnections/enums";
import { SecretRotation } from "@app/hooks/api/secretRotationsV2";

export const SECRET_ROTATION_MAP: Record<SecretRotation, { name: string; image: string }> = {
  [SecretRotation.PostgresCredentials]: { name: "PostgreSQL Credentials", image: "Postgres.png" },
  [SecretRotation.MsSqlCredentials]: {
    name: "Microsoft SQL Server Credentials",
    image: "MsSql.png"
  }
};

export const SECRET_ROTATION_CONNECTION_MAP: Record<SecretRotation, AppConnection> = {
  [SecretRotation.PostgresCredentials]: AppConnection.Postgres,
  [SecretRotation.MsSqlCredentials]: AppConnection.MsSql
};
