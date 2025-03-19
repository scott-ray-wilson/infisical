import z from "zod";

import { BaseSqlUsernameAndPasswordConnectionSchema } from "./sql-connection-schemas";

export type TBaseSqlConnectionCredentialsSchema = z.infer<typeof BaseSqlUsernameAndPasswordConnectionSchema>;
