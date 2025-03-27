import { SecretRotation } from "@app/ee/services/secret-rotation-v2/secret-rotation-v2-enums";
import { TSecretRotationV2ListItem } from "@app/ee/services/secret-rotation-v2/secret-rotation-v2-types";
import { AppConnection } from "@app/services/app-connection/app-connection-enums";

export const MSSQL_CREDENTIALS_ROTATION_LIST_OPTION: TSecretRotationV2ListItem = {
  name: "Microsoft SQL Server Credentials",
  type: SecretRotation.MsSqlCredentials,
  connection: AppConnection.MsSql,
  template: {
    parameters: {
      issueStatement: `CREATE LOGIN [{{username}}] WITH PASSWORD = '{{password}}'; CREATE USER [{{username}}] FOR LOGIN [{{username}}]; GRANT SELECT, INSERT, UPDATE, DELETE ON SCHEMA::dbo TO [{{username}}];`,
      revokeStatement: `DROP USER [{{username}}]; DROP LOGIN [{{username}}];`
    },
    secretsMapping: {
      username: "MSSQL_DB_USERNAME",
      password: "MSSQL_DB_PASSWORD"
    }
  }
};
