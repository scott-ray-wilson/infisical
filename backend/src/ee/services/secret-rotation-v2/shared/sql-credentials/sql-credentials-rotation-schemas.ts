import { z } from "zod";

import { SecretRotations } from "@app/lib/api-docs";
import { SecretNameSchema } from "@app/server/lib/schemas";

export const SqlCredentialsRotationGeneratedCredentialsSchema = z
  .object({
    username: z.string(),
    password: z.string()
  })
  .array()
  .min(1)
  .max(2);

export const SqlCredentialsRotationParametersSchema = z.object({
  usernameSecretKey: SecretNameSchema.describe(SecretRotations.PARAMETERS.SQL_CREDENTIALS.usernameSecretKey),
  passwordSecretKey: SecretNameSchema.describe(SecretRotations.PARAMETERS.SQL_CREDENTIALS.passwordSecretKey),
  issueStatement: z
    .string()
    .trim()
    .min(1, "Issue Credentials SQL Statement Required")
    .describe(SecretRotations.PARAMETERS.SQL_CREDENTIALS.issueStatement),
  revokeStatement: z
    .string()
    .trim()
    .min(1, "Revoke Credentials SQL Statement Required")
    .describe(SecretRotations.PARAMETERS.SQL_CREDENTIALS.revokeStatement)
});
