import { z } from "zod";

import { AwsParameterStoreSchema } from "./aws-parameter-store-schemas";

export type TAwsParameterStoreSecretSync = z.infer<typeof AwsParameterStoreSchema>;
