import { z } from "zod";

import { SecretRotations } from "@app/lib/api-docs";

export const SqlCredentialsRotationGeneratedCredentialsSchema = z
  .object({
    username: z.string(),
    password: z.string()
  })
  .array()
  .min(1)
  .max(2);

export const SqlCredentialsRotationParametersSchema = z.object({
  usernameSecretKey: z
    .string()
    .trim()
    .min(1, "Username Secret Key Required")
    .describe(SecretRotations.PARAMETERS.SQL_CREDENTIALS.usernameSecretKey),
  passwordSecretKey: z
    .string()
    .trim()
    .min(1, "Username Secret Key Required")
    .describe(SecretRotations.PARAMETERS.SQL_CREDENTIALS.passwordSecretKey),
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
