import { z } from "zod";

import { SecretSyncs } from "@app/lib/api-docs";
import { AppConnection, AWSRegion } from "@app/services/app-connection/app-connection-enums";
import { SecretSync } from "@app/services/secret-sync/secret-sync-enums";
import {
  BaseSecretSyncSchema,
  GenericCreateSecretSyncFieldsSchema,
  GenericUpdateSecretSyncFieldsSchema
} from "@app/services/secret-sync/secret-sync-schemas";

const AwsParameterStoreSyncDestinationConfigSchema = z.object({
  region: z.nativeEnum(AWSRegion).describe(SecretSyncs.DESTINATION_CONFIG.AWS_PARAMETER_STORE.region),
  path: z
    .string()
    .trim()
    .min(1, "Parameter Store Path required")
    .max(2048, "Cannot exceed 2048 characters")
    .regex(/^\/([/]|(([\w-]+\/)+))?$/, 'Invalid path - must follow "/example/path/" format')
    .describe(SecretSyncs.DESTINATION_CONFIG.AWS_PARAMETER_STORE.path),
  keyId: z
    .string()
    .regex(/^([a-zA-Z0-9:/_-]+)$/, "Invalid KMS Key ID")
    .min(1, "Invalid KMS Key ID")
    .max(256, "Invalid KMS Key ID")
    .optional()
    .describe(SecretSyncs.DESTINATION_CONFIG.AWS_PARAMETER_STORE.keyId),
  tags: z
    .object({
      key: z
        .string()
        .regex(
          /^([\p{L}\p{Z}\p{N}_.:/=+\-@]*)$/u,
          "Tag keys can only contain Unicode letters, digits, white space and any of the following: _."
        )
        .min(1, "AWS tag key required")
        .max(128, "AWS tag name cannot exceed 128 characters"),
      value: z
        .string()
        .regex(/^([\p{L}\p{Z}\p{N}_.:/=+\-@]*)$/u, "Invalid AWS tag value")
        .max(256, "Tag values can only contain Unicode letters, digits, white space and any of the following: _.:/=+@-")
    })
    .array()
    .max(50)
    .refine((items) => new Set(items.map((item) => item.key)).size === items.length, {
      message: "AWS tag keys must be unique"
    })
    .optional()
    .describe(SecretSyncs.DESTINATION_CONFIG.AWS_PARAMETER_STORE.tags),
  syncSecretMetadataAsTags: z
    .boolean()
    .optional()
    .describe(SecretSyncs.DESTINATION_CONFIG.AWS_PARAMETER_STORE.syncSecretMetadataAsTags)
});

export const AwsParameterStoreSyncSchema = BaseSecretSyncSchema(SecretSync.AWSParameterStore).extend({
  destination: z.literal(SecretSync.AWSParameterStore),
  destinationConfig: AwsParameterStoreSyncDestinationConfigSchema
});

export const CreateAwsParameterStoreSyncSchema = GenericCreateSecretSyncFieldsSchema(
  SecretSync.AWSParameterStore
).extend({
  destinationConfig: AwsParameterStoreSyncDestinationConfigSchema
});

export const UpdateAwsParameterStoreSyncSchema = GenericUpdateSecretSyncFieldsSchema(
  SecretSync.AWSParameterStore
).extend({
  destinationConfig: AwsParameterStoreSyncDestinationConfigSchema.optional()
});

export const AwsParameterStoreSyncListItemSchema = z.object({
  name: z.literal("AWS Parameter Store"),
  connection: z.literal(AppConnection.AWS),
  destination: z.literal(SecretSync.AWSParameterStore),
  canImportSecrets: z.literal(true)
});
