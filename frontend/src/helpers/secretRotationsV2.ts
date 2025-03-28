import { AppConnection } from "@app/hooks/api/appConnections/enums";
import { SecretRotation, TSecretRotationV2 } from "@app/hooks/api/secretRotationsV2";

export const SECRET_ROTATION_MAP: Record<SecretRotation, { name: string; image: string }> = {
  [SecretRotation.PostgresCredentials]: { name: "PostgreSQL Credentials", image: "Postgres.png" },
  [SecretRotation.MsSqlCredentials]: {
    name: "Microsoft SQL Server Credentials",
    image: "MsSql.png"
  },
  [SecretRotation.MySqlCredentials]: {
    name: "MySQL Credentials",
    image: "MySql.png"
  },
  [SecretRotation.SendGridApiKey]: {
    name: "SendGrid API Key",
    image: "SendGrid.png"
  },
  [SecretRotation.AwsIamCredentials]: {
    name: "AWS IAM User Credentials",
    image: "Amazon Web Services.png"
  }
};

export const SECRET_ROTATION_CONNECTION_MAP: Record<SecretRotation, AppConnection> = {
  [SecretRotation.PostgresCredentials]: AppConnection.Postgres,
  [SecretRotation.MsSqlCredentials]: AppConnection.MsSql,
  // TODO: replace with actual connections once implemented
  [SecretRotation.MySqlCredentials]: AppConnection.AWS,
  [SecretRotation.SendGridApiKey]: AppConnection.AWS,
  [SecretRotation.AwsIamCredentials]: AppConnection.AWS
};

export const getRotateAtLocal = ({ hours, minutes }: TSecretRotationV2["rotateAtUtc"]) =>
  new Date(
    Date.UTC(
      new Date().getUTCFullYear(),
      new Date().getUTCMonth(),
      new Date().getUTCDate(),
      hours,
      minutes,
      0,
      0
    )
  );
