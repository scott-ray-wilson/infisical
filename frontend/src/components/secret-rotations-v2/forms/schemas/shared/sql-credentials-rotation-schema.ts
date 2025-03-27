import { z } from "zod";

import { SecretNameSchema } from "@app/lib/schemas";

export const SqlCredentialsRotationSchema = z.object({
  parameters: z.object({
    issueStatement: z.string().trim().min(1, "Issue Credentials SQL Statement Required"),
    revokeStatement: z.string().trim().min(1, "Revoke Credentials SQL Statement Required")
  }),
  secretsMapping: z.object({
    username: SecretNameSchema,
    password: SecretNameSchema
  })
});
