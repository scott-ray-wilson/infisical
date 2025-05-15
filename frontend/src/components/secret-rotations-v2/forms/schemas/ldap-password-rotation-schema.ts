import { z } from "zod";

import { BaseSecretRotationSchema } from "@app/components/secret-rotations-v2/forms/schemas/base-secret-rotation-v2-schema";
import { PasswordRequirementsSchema } from "@app/components/secret-rotations-v2/forms/schemas/shared";
import { DistinguishedNameRegex, UserPrincipalNameRegex } from "@app/helpers/string";
import { SecretRotation } from "@app/hooks/api/secretRotationsV2";

export const LdapPasswordRotationSchema = z
  .object({
    type: z.literal(SecretRotation.LdapPassword),
    parameters: z.object({
      dn: z
        .string()
        .trim()
        .min(1, "DN/UPN required")
        .refine(
          (value) => DistinguishedNameRegex.test(value) || UserPrincipalNameRegex.test(value),
          {
            message: "Invalid DN/UPN format"
          }
        ),
      passwordRequirements: PasswordRequirementsSchema.optional()
    }),
    secretsMapping: z.object({
      dn: z.string().trim().min(1, "DN/UPN required"),
      password: z.string().trim().min(1, "Password required")
    })
  })
  .merge(BaseSecretRotationSchema);
