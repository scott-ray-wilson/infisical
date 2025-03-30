import knex, { Knex } from "knex";

import {
  TSqlCredentialsRotationGeneratedCredentials,
  TSqlCredentialsRotationWithConnection
} from "@app/ee/services/secret-rotation-v2/shared/sql-credentials/sql-credentials-rotation-types";
import { getConfig } from "@app/lib/config/env";
import { BadRequestError } from "@app/lib/errors";
import { getDbConnectionHost } from "@app/lib/knex";
import { alphaNumericNanoId } from "@app/lib/nanoid";
import { AppConnection } from "@app/services/app-connection/app-connection-enums";
import { TAppConnectionRaw, TSqlConnection } from "@app/services/app-connection/app-connection-types";
import { TSqlConnectionConfig } from "@app/services/app-connection/shared/sql/sql-connection-types";

const EXTERNAL_REQUEST_TIMEOUT = 10 * 1000;

const SQL_CONNECTION_CLIENT_MAP = {
  [AppConnection.Postgres]: "pg",
  [AppConnection.MsSql]: "mssql"
};

export const getSqlConnectionClient = async (
  appConnection: Pick<TSqlConnection, "credentials" | "app">,
  options?: Record<string, unknown>
) => {
  const appCfg = getConfig();

  const {
    app,
    credentials: { host, database, port, sslCertificate, password, username }
  } = appConnection;

  const ssl = sslCertificate ? { rejectUnauthorized: false, ca: sslCertificate } : undefined;
  const isCloud = Boolean(appCfg.LICENSE_SERVER_KEY); // quick and dirty way to check if its cloud or not
  const dbHost = appCfg.DB_HOST || getDbConnectionHost(appCfg.DB_CONNECTION_URI);

  if (
    (isCloud &&
      // internal ips
      (host === "host.docker.internal" || host.match(/^10\.\d+\.\d+\.\d+/) || host.match(/^192\.168\.\d+\.\d+/))) ||
    host === "localhost" ||
    host === "127.0.0.1" ||
    // Infisical's database
    dbHost === host
  )
    throw new Error("Invalid Host");

  const client = knex({
    client: SQL_CONNECTION_CLIENT_MAP[app],
    connection: {
      database,
      port,
      host,
      user: username,
      password,
      connectionTimeoutMillis: EXTERNAL_REQUEST_TIMEOUT,
      ssl,
      options
    }
  });

  return client;
};

export const validateSqlConnectionCredentials = async (config: TSqlConnectionConfig) => {
  const { credentials, app } = config;

  const client = await getSqlConnectionClient({ app, credentials });

  try {
    await client.raw(`Select 1`);

    return credentials;
  } catch (error) {
    throw new BadRequestError({
      message: (error as Error)?.message ?? "Unable to validate connection: verify credentials"
    });
  } finally {
    await client.destroy();
  }
};

export const SQL_CONNECTION_ALTER_LOGIN_STATEMENT: Record<
  TSqlCredentialsRotationWithConnection["connection"]["app"],
  (credentials: TSqlCredentialsRotationGeneratedCredentials[number]) => [string, Knex.RawBinding]
> = {
  [AppConnection.Postgres]: ({ username, password }) => [`ALTER USER ?? WITH PASSWORD '${password}';`, [username]],
  [AppConnection.MsSql]: ({ username, password }) => [`ALTER LOGIN ?? WITH PASSWORD = '${password}';`, [username]]
};

export const transferSqlConnectionCredentialsToPlatform = async (
  config: TSqlConnectionConfig,
  callback: (credentials: TSqlConnectionConfig["credentials"]) => Promise<TAppConnectionRaw>
) => {
  const { credentials, app } = config;

  const client = await getSqlConnectionClient({ app, credentials });

  const newPassword = alphaNumericNanoId(32);

  try {
    return await client.transaction(async (tx) => {
      await tx.raw(
        ...SQL_CONNECTION_ALTER_LOGIN_STATEMENT[app]({ username: credentials.username, password: newPassword })
      );
      return callback({
        ...credentials,
        password: newPassword
      });
    });
  } catch (error) {
    throw new BadRequestError({
      message: (error as Error)?.message ?? "Unable to validate connection: verify credentials"
    });
  } finally {
    await client.destroy();
  }
};
