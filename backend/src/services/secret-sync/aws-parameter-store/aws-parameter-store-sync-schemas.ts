import { z } from "zod";

import { wrapWithSlashes } from "@app/lib/fn";
import { AppConnection, AWSRegion } from "@app/services/app-connection/app-connection-enums";
import { SecretSync } from "@app/services/secret-sync/secret-sync-enums";
import {
  BaseSecretSyncSchema,
  GenericCreateSecretSyncFieldsSchema,
  GenericUpdateSecretSyncFieldsSchema
} from "@app/services/secret-sync/secret-sync-schemas";

const AwsParameterStoreSyncDestinationConfigSchema = z.object({
  region: z.nativeEnum(AWSRegion),
  path: z.string().min(1, "AWS Parameter Store Path Required").transform(wrapWithSlashes)
  // keyId: z.string().optional()
});

export const AwsParameterStoreSyncSchema = BaseSecretSyncSchema(AppConnection.AWS).extend({
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
  destination: z.literal(SecretSync.AWSParameterStore)
});
