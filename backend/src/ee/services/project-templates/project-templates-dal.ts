import { TDbClient } from "@app/db";
import { TableName } from "@app/db/schemas";
import { ormify } from "@app/lib/knex";

export type TProjectTemplatesDALFactory = ReturnType<typeof projectTemplatesDALFactory>;

export const projectTemplatesDALFactory = (db: TDbClient) => ormify(db, TableName.ProjectTemplates);
