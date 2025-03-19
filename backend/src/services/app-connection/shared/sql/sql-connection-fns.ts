import knex from "knex";

import { getConfig } from "@app/lib/config/env";
import { getDbConnectionHost } from "@app/lib/knex";
import { AppConnection } from "@app/services/app-connection/app-connection-enums";
import { TSqlConnection } from "@app/services/app-connection/app-connection-types";

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
    credentials: { host, database, port, ca, password, username }
  } = appConnection;

  const ssl = ca ? { rejectUnauthorized: false, ca } : undefined;
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
