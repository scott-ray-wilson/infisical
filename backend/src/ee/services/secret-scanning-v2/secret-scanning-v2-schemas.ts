import { z } from "zod";

import { SecretScanningSourcesSchema } from "@app/db/schemas";
import { SecretScanningSource } from "@app/ee/services/secret-scanning-v2/secret-scanning-v2-enums";
import { SECRET_SCANNING_SOURCE_CONNECTION_MAP } from "@app/ee/services/secret-scanning-v2/secret-scanning-v2-maps";
import { SecretScanningSources } from "@app/lib/api-docs";
import { slugSchema } from "@app/server/lib/schemas";

type SecretScanningSourceSchemaOpts = {
  type: SecretScanningSource;
  isConnectionRequired: boolean;
};

// TODO: check if need type support for is connection required
export const BaseSecretScanningSourceSchema = ({ type, isConnectionRequired }: SecretScanningSourceSchemaOpts) =>
  SecretScanningSourcesSchema.omit({
    // unique to provider
    type: true,
    connectionId: true,
    config: true
  }).extend({
    type: z.literal(type),
    connectionId: isConnectionRequired ? z.string().uuid() : z.null(),
    connection: isConnectionRequired
      ? z.object({
          app: z.literal(SECRET_SCANNING_SOURCE_CONNECTION_MAP[type]),
          name: z.string(),
          id: z.string().uuid()
        })
      : z.null()
  });

export const BaseCreateSecretScanningSourceSchema = ({ type, isConnectionRequired }: SecretScanningSourceSchemaOpts) =>
  z.object({
    name: slugSchema({ field: "name" }).describe(SecretScanningSources.CREATE(type).name),
    projectId: z.string().trim().min(1, "Project ID required").describe(SecretScanningSources.CREATE(type).projectId),
    description: z
      .string()
      .trim()
      .max(256, "Description cannot exceed 256 characters")
      .nullish()
      .describe(SecretScanningSources.CREATE(type).description),
    connectionId: isConnectionRequired
      ? z.string().uuid().describe(SecretScanningSources.CREATE(type).connectionId)
      : z.undefined(),
    isAutoScanEnabled: z
      .boolean()
      .optional()
      .default(true)
      .describe(SecretScanningSources.CREATE(type).isAutoScanEnabled)
  });

export const BaseUpdateSecretScanningSourceSchema = (type: SecretScanningSource) =>
  z.object({
    name: slugSchema({ field: "name" }).describe(SecretScanningSources.UPDATE(type).name).optional(),
    description: z
      .string()
      .trim()
      .max(256, "Description cannot exceed 256 characters")
      .nullish()
      .describe(SecretScanningSources.UPDATE(type).description),
    isAutoScanEnabled: z.boolean().optional().describe(SecretScanningSources.UPDATE(type).isAutoScanEnabled)
  });
