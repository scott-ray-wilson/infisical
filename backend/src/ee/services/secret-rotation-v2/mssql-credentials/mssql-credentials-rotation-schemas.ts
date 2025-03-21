import { z } from "zod";

import { SecretRotation } from "@app/ee/services/secret-rotation-v2/secret-rotation-v2-enums";
import {
  BaseCreateSecretRotationSchema,
  BaseSecretRotationSchema,
  BaseUpdateSecretRotationSchema
} from "@app/ee/services/secret-rotation-v2/secret-rotation-v2-schemas";
import {
  SqlCredentialsRotationParametersSchema,
  SqlCredentialsRotationParametersTemplateSchema
} from "@app/ee/services/secret-rotation-v2/shared/sql-credentials";
import { AppConnection } from "@app/services/app-connection/app-connection-enums";

export const MsSqlCredentialsRotationSchema = BaseSecretRotationSchema(SecretRotation.MsSqlCredentials).extend({
  type: z.literal(SecretRotation.MsSqlCredentials),
  parameters: SqlCredentialsRotationParametersSchema
});

export const CreateMsSqlCredentialsRotationSchema = BaseCreateSecretRotationSchema(
  SecretRotation.MsSqlCredentials
).extend({
  parameters: SqlCredentialsRotationParametersSchema
});

export const UpdateMsSqlCredentialsRotationSchema = BaseUpdateSecretRotationSchema(
  SecretRotation.MsSqlCredentials
).extend({
  parameters: SqlCredentialsRotationParametersSchema.optional()
});

export const MsSqlCredentialsRotationListItemSchema = z.object({
  name: z.literal("Microsoft SQL Server Credentials"),
  connection: z.literal(AppConnection.MsSql),
  type: z.literal(SecretRotation.MsSqlCredentials),
  parametersTemplate: SqlCredentialsRotationParametersTemplateSchema
});
