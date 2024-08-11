import { Knex } from "knex";

import { TDbClient } from "@app/db";
import { TableName } from "@app/db/schemas";
import { ormify } from "@app/lib/knex";

export type TConsumerSecretDALFactory = ReturnType<typeof consumerSecretDALFactory>;

export const consumerSecretDALFactory = (db: TDbClient) => {
  const consumerSecretOrm = ormify(db, TableName.ConsumerSecret);

  const getUserConsumerSecretsForOrg = async (userId: string, orgId: string, tx?: Knex) => {
    const consumerSecrets = await (tx || db.replicaNode())(TableName.ConsumerSecret)
      .where("userId", userId)
      .where("orgId", orgId)
      .orderBy("type", "asc");

    return consumerSecrets;
  };

  return {
    ...consumerSecretOrm,
    getUserConsumerSecretsForOrg
  };
};
