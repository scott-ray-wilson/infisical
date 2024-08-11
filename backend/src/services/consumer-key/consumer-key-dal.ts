import { Knex } from "knex";

import { TDbClient } from "@app/db";
import { TableName, TConsumerKeys } from "@app/db/schemas";
import { DatabaseError } from "@app/lib/errors";
import { ormify, selectAllTableCols } from "@app/lib/knex";

export type TConsumerKeyDALFactory = ReturnType<typeof consumerKeyDALFactory>;

export const consumerKeyDALFactory = (db: TDbClient) => {
  const consumerKeyOrm = ormify(db, TableName.ConsumerKey);

  const findLatestConsumerKey = async (
    userId: string,
    orgId: string,
    tx?: Knex
  ): Promise<(TConsumerKeys & { sender: { publicKey: string } }) | undefined> => {
    try {
      const consumerKey = await (tx || db.replicaNode())(TableName.ConsumerKey)
        .join(TableName.Users, `${TableName.ConsumerKey}.senderId`, `${TableName.Users}.id`)
        .join(TableName.UserEncryptionKey, `${TableName.UserEncryptionKey}.userId`, `${TableName.Users}.id`)
        .where({ orgId, receiverId: userId })
        .orderBy("createdAt", "desc", "last")
        .select(selectAllTableCols(TableName.ConsumerKey))
        .select(db.ref("publicKey").withSchema(TableName.UserEncryptionKey))
        .first();
      if (consumerKey) {
        return { ...consumerKey, sender: { publicKey: consumerKey.publicKey } };
      }
    } catch (error) {
      throw new DatabaseError({ error, name: "Find latest consumer key" });
    }
  };

  return {
    ...consumerKeyOrm,
    findLatestConsumerKey
  };
};
