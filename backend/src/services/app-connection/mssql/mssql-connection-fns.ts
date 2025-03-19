import { BadRequestError } from "@app/lib/errors";
import { alphaNumericNanoId } from "@app/lib/nanoid";
import { AppConnection } from "@app/services/app-connection/app-connection-enums";
import { getSqlConnectionClient } from "@app/services/app-connection/shared/sql";

import { MsSqlConnectionMethod } from "./mssql-connection-enums";
import { TMsSqlConnectionConfig } from "./mssql-connection-types";

export const getMsSqlConnectionListItem = () => {
  return {
    name: "Microsoft SQL Server" as const,
    app: AppConnection.MsSql as const,
    methods: Object.values(MsSqlConnectionMethod) as [MsSqlConnectionMethod.UsernameAndPassword],
    supportsPlatformManagement: true as const
  };
};

export const validateMsSqlConnectionCredentials = async (config: TMsSqlConnectionConfig) => {
  const { credentials, isPlatformManaged } = config;

  const client = await getSqlConnectionClient({ app: AppConnection.MsSql, credentials });

  try {
    if (isPlatformManaged) {
      const newPassword = alphaNumericNanoId(32);

      await client.raw(`ALTER LOGIN ?? WITH PASSWORD = '${newPassword}' OLD_PASSWORD = '${credentials.password}';`, [
        credentials.username
      ]);

      return {
        ...credentials,
        password: newPassword
      };
    }

    await client.raw(`SELECT 1`);

    return credentials;
  } catch (e) {
    if ((e as { number: number }).number === 15151) {
      throw new BadRequestError({
        message: `Cannot alter the login '${credentials.username}', because it does not exist or you do not have permission.`
      });
    }

    throw new BadRequestError({ message: "Unable to validate connection - verify credentials" });
  } finally {
    await client.destroy();
  }
};
