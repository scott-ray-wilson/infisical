import { z } from "zod";

import {
  TMsSqlCredentialsRotation,
  TMsSqlCredentialsRotationWithConnection
} from "@app/ee/services/secret-rotation-v2/mssql-credentials";
import {
  TPostgresCredentialsRotation,
  TPostgresCredentialsRotationWithConnection
} from "@app/ee/services/secret-rotation-v2/postgres-credentials";

import { SqlCredentialsRotationGeneratedCredentialsSchema } from "./sql-credentials-rotation-schemas";

export type TSqlCredentialsRotation = TPostgresCredentialsRotation | TMsSqlCredentialsRotation;

export type TSqlCredentialsRotationWithConnection =
  | TPostgresCredentialsRotationWithConnection
  | TMsSqlCredentialsRotationWithConnection;

export type TSqlCredentialsRotationGeneratedCredentials = z.infer<
  typeof SqlCredentialsRotationGeneratedCredentialsSchema
>;
