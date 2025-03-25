import { AppConnection } from "@app/hooks/api/appConnections/enums";
import { SecretRotation } from "@app/hooks/api/secretRotationsV2";
import {
  TMsSqlCredentialsRotation,
  TMsSqlCredentialsRotationGeneratedCredentialsResponse
} from "@app/hooks/api/secretRotationsV2/types/mssql-credentials-rotation";
import {
  TPostgresCredentialsRotation,
  TPostgresCredentialsRotationGeneratedCredentialsResponse
} from "@app/hooks/api/secretRotationsV2/types/postgres-credentials-rotation";
import { DiscriminativePick } from "@app/types";

export type TSecretRotationV2 = TPostgresCredentialsRotation | TMsSqlCredentialsRotation;

export type TSecretRotationV2Option = {
  name: string;
  type: SecretRotation;
  connection: AppConnection;
  parametersTemplate: TSecretRotationV2["parameters"];
};

export type TListSecretRotationV2Options = { secretRotationOptions: TSecretRotationV2Option[] };

export type TSecretRotationV2Response = { secretRotation: TSecretRotationV2 };

export type TViewSecretRotationGeneratedCredentialsResponse =
  | TPostgresCredentialsRotationGeneratedCredentialsResponse
  | TMsSqlCredentialsRotationGeneratedCredentialsResponse;

export type TCreateSecretRotationV2DTO = DiscriminativePick<
  TSecretRotationV2,
  | "name"
  | "parameters"
  | "description"
  | "connectionId"
  | "type"
  | "isAutoRotationEnabled"
  | "interval"
> & { environment: string; secretPath: string; projectId: string };

export type TUpdateSecretRotationV2DTO = Partial<
  Omit<TCreateSecretRotationV2DTO, "type" | "projectId" | "secretPath" | "projectId">
> & {
  type: SecretRotation;
  rotationId: string;
  // required for query invalidation
  projectId: string;
  secretPath: string;
};

export type TRotateSecretRotationV2DTO = {
  rotationId: string;
  type: SecretRotation;
  // required for query invalidation
  secretPath: string;
  projectId: string;
};

export type TViewSecretRotationV2CredentialsDTO = {
  rotationId: string;
  type: SecretRotation;
};
