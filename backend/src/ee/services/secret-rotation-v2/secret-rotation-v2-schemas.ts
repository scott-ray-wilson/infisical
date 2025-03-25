import { z } from "zod";

import { SecretRotationsV2Schema } from "@app/db/schemas/secret-rotations-v2";
import { SecretRotation } from "@app/ee/services/secret-rotation-v2/secret-rotation-v2-enums";
import { SECRET_ROTATION_CONNECTION_MAP } from "@app/ee/services/secret-rotation-v2/secret-rotation-v2-maps";
import { SecretRotations } from "@app/lib/api-docs";
import { removeTrailingSlash } from "@app/lib/fn";
import { slugSchema } from "@app/server/lib/schemas";

export const BaseSecretRotationSchema = (type: SecretRotation) =>
  SecretRotationsV2Schema.omit({
    type: true,
    parameters: true,
    encryptedGeneratedCredentials: true
  }).extend({
    connection: z.object({
      app: z.literal(SECRET_ROTATION_CONNECTION_MAP[type]),
      name: z.string(),
      id: z.string().uuid()
    }),
    environment: z.object({ slug: z.string(), name: z.string(), id: z.string().uuid() }),
    projectId: z.string(),
    folder: z.object({ id: z.string(), path: z.string() })
  });

export const BaseCreateSecretRotationSchema = (type: SecretRotation) =>
  z.object({
    name: slugSchema({ field: "name" }).describe(SecretRotations.CREATE(type).name),
    projectId: z.string().trim().min(1, "Project ID required").describe(SecretRotations.CREATE(type).projectId),
    description: z
      .string()
      .trim()
      .max(256, "Description cannot exceed 256 characters")
      .nullish()
      .describe(SecretRotations.CREATE(type).description),
    connectionId: z.string().uuid().describe(SecretRotations.CREATE(type).connectionId),
    environment: slugSchema({ field: "environment", max: 64 }).describe(SecretRotations.CREATE(type).environment),
    secretPath: z
      .string()
      .trim()
      .min(1, "Secret path required")
      .transform(removeTrailingSlash)
      .describe(SecretRotations.CREATE(type).secretPath),
    isAutoRotationEnabled: z
      .boolean()
      .optional()
      .default(true)
      .describe(SecretRotations.CREATE(type).isAutoRotationEnabled),
    rotationInterval: z.coerce.number().min(1).describe(SecretRotations.CREATE(type).interval),
    nextRotationAt: z.coerce
      .date()
      .optional()
      .refine((rotateAt) => (rotateAt ? rotateAt.getTime() > Date.now() : true), {
        message: "Scheduled rotation must be for a future datetime"
      })
      .describe(SecretRotations.CREATE(type).nextRotationAt)
  });

export const BaseUpdateSecretRotationSchema = (type: SecretRotation) =>
  z.object({
    name: slugSchema({ field: "name" }).describe(SecretRotations.UPDATE(type).name).optional(),
    description: z
      .string()
      .trim()
      .max(256, "Description cannot exceed 256 characters")
      .nullish()
      .describe(SecretRotations.UPDATE(type).description),
    isAutoRotationEnabled: z.boolean().optional().describe(SecretRotations.UPDATE(type).isAutoRotationEnabled),
    rotationInterval: z.coerce.number().min(1).optional().describe(SecretRotations.UPDATE(type).interval),
    nextRotationAt: z.coerce
      .date()
      .optional()
      .refine((scheduledRotationAt) => (scheduledRotationAt ? scheduledRotationAt.getTime() > Date.now() : true), {
        message: "Scheduled rotation must be for a future datetime"
      })
      .describe(SecretRotations.UPDATE(type).nextRotationAt)
  });
