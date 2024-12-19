import { TDbClient } from "@app/db";
import { TableName } from "@app/db/schemas";
import { ormify } from "@app/lib/knex";

export type TSecretSyncDALFactory = ReturnType<typeof secretSyncDALFactory>;

export const secretSyncDALFactory = (db: TDbClient) => {
  const secretSyncOrm = ormify(db, TableName.AppConnection);

  return { ...secretSyncOrm };
};
