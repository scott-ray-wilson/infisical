import { TSqlCredentialsRotationGeneratedCredentials } from "@app/ee/services/secret-rotation-v2/shared/sql-credentials/sql-credentials-rotation-types";

import {
  TMsSqlCredentialsRotation,
  TMsSqlCredentialsRotationInput,
  TMsSqlCredentialsRotationListItem,
  TMsSqlCredentialsRotationWithConnection
} from "./mssql-credentials";
import {
  TPostgresCredentialsRotation,
  TPostgresCredentialsRotationInput,
  TPostgresCredentialsRotationListItem,
  TPostgresCredentialsRotationWithConnection
} from "./postgres-credentials";
import { TSecretRotationV2DALFactory } from "./secret-rotation-v2-dal";
import { SecretRotation } from "./secret-rotation-v2-enums";

export type TSecretRotationV2 = TPostgresCredentialsRotation | TMsSqlCredentialsRotation;

export type TSecretRotationV2WithConnection =
  | TPostgresCredentialsRotationWithConnection
  | TMsSqlCredentialsRotationWithConnection;

export type TSecretRotationV2GeneratedCredentials = TSqlCredentialsRotationGeneratedCredentials;

export type TSecretRotationV2Input = TPostgresCredentialsRotationInput | TMsSqlCredentialsRotationInput;

export type TSecretRotationV2ListItem = TPostgresCredentialsRotationListItem | TMsSqlCredentialsRotationListItem;

export type TSecretRotationV2Raw = NonNullable<Awaited<ReturnType<TSecretRotationV2DALFactory["findById"]>>>;

export type TListSecretRotationsV2ByProjectId = {
  projectId: string;
  type?: SecretRotation;
};

export type TFindSecretRotationV2ByIdDTO = {
  rotationId: string;
  type: SecretRotation;
};

export type TRotateSecretRotationV2 = TFindSecretRotationV2ByIdDTO;

export type TFindSecretRotationV2ByNameDTO = {
  rotationName: string;
  projectId: string;
  type: SecretRotation;
};

export type TCreateSecretRotationV2DTO = Pick<
  TSecretRotationV2,
  "parameters" | "description" | "interval" | "name" | "connectionId" | "projectId"
> & {
  type: SecretRotation;
  secretPath: string;
  environment: string;
  isAutoRotationEnabled?: boolean;
};

export type TUpdateSecretRotationV2DTO = Partial<Omit<TCreateSecretRotationV2DTO, "projectId" | "connectionId">> & {
  rotationId: string;
  type: SecretRotation;
};

export type TDeleteSecretRotationV2DTO = {
  type: SecretRotation;
  rotationId: string;
  removeSecrets: boolean;
};
