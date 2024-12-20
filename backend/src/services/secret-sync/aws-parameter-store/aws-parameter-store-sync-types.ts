import { z } from "zod";

import { SecretSync } from "@app/services/secret-sync/secret-sync-enums";

import {
  AwsParameterStoreSyncListItemSchema,
  AwsParameterStoreSyncSchema,
  CreateAwsParameterStoreSyncSchema
} from "./aws-parameter-store-sync-schemas";

export type TAwsParameterStoreSync = z.infer<typeof AwsParameterStoreSyncSchema>;

export type TAwsParameterStoreSyncInput = z.infer<typeof CreateAwsParameterStoreSyncSchema> & {
  syncDestination: SecretSync.AWSParameterStore;
};

export type TAwsParameterStoreSyncListItem = z.infer<typeof AwsParameterStoreSyncListItemSchema>;
