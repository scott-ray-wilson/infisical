import { SecretRotation } from "@app/ee/services/secret-rotation-v2/secret-rotation-v2-enums";
import { TSecretRotationV2ListItem } from "@app/ee/services/secret-rotation-v2/secret-rotation-v2-types";
import { AppConnection } from "@app/services/app-connection/app-connection-enums";

export const POSTGRES_CREDENTIALS_ROTATION_LIST_OPTION: TSecretRotationV2ListItem = {
  name: "PostgreSQL Credentials",
  type: SecretRotation.PostgresCredentials,
  connection: AppConnection.Postgres,
  template: {
    createUserStatement: `CREATE USER "my-pg-user" WITH ENCRYPTED PASSWORD 'temporary-password'; GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO "my-pg-user";`,
    secretsMapping: {
      username: "POSTGRES_DB_USERNAME",
      password: "POSTGRES_DB_PASSWORD"
    }
  }
};
