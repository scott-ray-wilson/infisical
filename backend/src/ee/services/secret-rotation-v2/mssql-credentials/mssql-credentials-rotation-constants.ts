import { SecretRotation } from "@app/ee/services/secret-rotation-v2/secret-rotation-v2-enums";
import { TSecretRotationV2ListItem } from "@app/ee/services/secret-rotation-v2/secret-rotation-v2-types";
import { AppConnection } from "@app/services/app-connection/app-connection-enums";

export const MSSQL_CREDENTIALS_ROTATION_LIST_OPTION: TSecretRotationV2ListItem = {
  name: "Microsoft SQL Server Credentials",
  type: SecretRotation.MsSqlCredentials,
  connection: AppConnection.MsSql,
  // TODO: update to mssql
  parametersTemplate: {
    usernameSecretKey: "POSTGRES_DB_USERNAME",
    passwordSecretKey: "POSTGRES_DB_PASSWORD",
    issueStatement: `CREATE USER "{{username}}" WITH ENCRYPTED PASSWORD '{{password}}'; GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO "{{username}}";`,
    revokeStatement: `REVOKE ALL PRIVILEGES ON ALL TABLES IN SCHEMA public FROM "{{username}}"; DROP ROLE "{{username}}";`
  }
};
