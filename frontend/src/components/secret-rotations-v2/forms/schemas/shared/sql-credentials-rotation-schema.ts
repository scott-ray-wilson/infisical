import { z } from "zod";

import { SecretNameSchema } from "@app/lib/schemas";

export const SqlCredentialsRotationParametersSchema = z.object({
  usernameSecretKey: SecretNameSchema,
  passwordSecretKey: SecretNameSchema,
  issueStatement: z.string().trim().min(1, "Issue Credentials SQL Statement Required"),
  revokeStatement: z.string().trim().min(1, "Revoke Credentials SQL Statement Required")
});
