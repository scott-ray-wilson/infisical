import { BadRequestError } from "@app/lib/errors";
import { alphaNumericNanoId } from "@app/lib/nanoid";
import { AppConnection } from "@app/services/app-connection/app-connection-enums";
import { getSqlConnectionClient } from "@app/services/app-connection/shared/sql";

import { PostgresConnectionMethod } from "./postgres-connection-enums";
import { TPostgresConnectionConfig } from "./postgres-connection-types";

export const getPostgresConnectionListItem = () => {
  return {
    name: "PostgreSQL" as const,
    app: AppConnection.Postgres as const,
    methods: Object.values(PostgresConnectionMethod) as [PostgresConnectionMethod.UsernameAndPassword],
    supportsPlatformManagement: true as const
  };
};

export const validatePostgresConnectionCredentials = async (config: TPostgresConnectionConfig) => {
  const { credentials, isPlatformManaged } = config;

  const client = await getSqlConnectionClient({ app: AppConnection.Postgres, credentials });

  try {
    if (isPlatformManaged) {
      const newPassword = alphaNumericNanoId(32);

      await client.raw(`ALTER USER ?? WITH PASSWORD '${newPassword}';`, [credentials.username]);

      return {
        ...credentials,
        password: newPassword
      };
    }

    await client.raw(`Select 1`);

    return credentials;
  } catch (e) {
    throw new BadRequestError({
      message: (error as Error)?.message ?? "Unable to validate connection - verify credentials"
    });
  } finally {
    await client.destroy();
  }
};
