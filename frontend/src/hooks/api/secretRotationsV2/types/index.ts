import { AppConnection } from "@app/hooks/api/appConnections/enums";
import { SecretRotation } from "@app/hooks/api/secretRotationsV2";
import { TMsSqlCredentialsRotation } from "@app/hooks/api/secretRotationsV2/types/mssql-credentials-rotation";
import { TPostgresCredentialsRotation } from "@app/hooks/api/secretRotationsV2/types/postgres-credentials-rotation";
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
