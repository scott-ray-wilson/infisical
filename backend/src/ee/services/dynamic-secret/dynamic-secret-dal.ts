import { Knex } from "knex";

import { TDbClient } from "@app/db";
import { TableName } from "@app/db/schemas";
import { DatabaseError } from "@app/lib/errors";
import { ormify, selectAllTableCols } from "@app/lib/knex";
import { OrderByDirection } from "@app/lib/types";
import { SecretsOrderBy } from "@app/services/secret/secret-types";

export type TDynamicSecretDALFactory = ReturnType<typeof dynamicSecretDALFactory>;

export const dynamicSecretDALFactory = (db: TDbClient) => {
  const orm = ormify(db, TableName.DynamicSecret);

  const findMultiEnv = async (
    {
      folderIds,
      search,
      limit,
      offset = 0,
      orderBy = SecretsOrderBy.Name,
      orderDirection = OrderByDirection.ASC
    }: {
      folderIds: string[];
      search?: string;
      limit?: number;
      offset?: number;
      orderBy?: SecretsOrderBy;
      orderDirection?: OrderByDirection;
    },
    tx?: Knex
  ) => {
    try {
      const query = (tx || db.replicaNode())(TableName.DynamicSecret)
        .whereIn("folderId", folderIds)
        .where((bd) => {
          if (search) {
            void bd.whereILike("name", `%${search}%`);
          }
        })
        .select(
          selectAllTableCols(TableName.DynamicSecret),
          db.raw(`DENSE_RANK() OVER (ORDER BY "name" ${orderDirection ?? OrderByDirection.ASC}) as rank`)
        )
        .orderBy(orderBy, orderDirection);

      if (limit) {
        const rankOffset = offset + 1;
        return await (tx || db)
          .with("w", query)
          .select("*")
          .from<Awaited<typeof query>[number]>("w")
          .where("w.rank", ">=", rankOffset)
          .andWhere("w.rank", "<", rankOffset + limit);
      }

      const dynamicSecrets = await query;

      return dynamicSecrets;
    } catch (error) {
      throw new DatabaseError({ error, name: "List dynamic secret multi env" });
    }
  };

  return { ...orm, findMultiEnv };
};
