import { z } from "zod";

import { AwsParameterStoreSyncListItemSchema, AwsParameterStoreSyncSchema } from "./aws-parameter-store-sync-schemas";

export type TAwsParameterStoreSync = z.infer<typeof AwsParameterStoreSyncSchema>;

export type TAwsParameterStoreSyncListItem = z.infer<typeof AwsParameterStoreSyncListItemSchema>;
