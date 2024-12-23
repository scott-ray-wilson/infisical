import { Knex } from "knex";

import { TDbClient } from "@app/db";
import { TableName } from "@app/db/schemas";
import { TSecretSyncs } from "@app/db/schemas/secret-syncs";
import { DatabaseError } from "@app/lib/errors";
import { buildFindFilter, ormify, selectAllTableCols } from "@app/lib/knex";

export type TSecretSyncDALFactory = ReturnType<typeof secretSyncDALFactory>;

const baseSecretSyncQuery = ({
  filter,
  db,
  tx
}: {
  db: TDbClient;
  filter?: Parameters<typeof buildFindFilter<TSecretSyncs>>[0];
  tx?: Knex;
}) => {
  const query = (tx || db.replicaNode())(TableName.SecretSync)
    .join(TableName.Environment, `${TableName.SecretSync}.envId`, `${TableName.Environment}.id`)
    .join(TableName.AppConnection, `${TableName.SecretSync}.connectionId`, `${TableName.AppConnection}.id`)
    .select(selectAllTableCols(TableName.SecretSync))
    .select(
      db.ref("name").withSchema(TableName.Environment).as("envName"),
      db.ref("id").withSchema(TableName.Environment).as("envId"),
      db.ref("slug").withSchema(TableName.Environment).as("envSlug"),
      db.ref("projectId").withSchema(TableName.Environment),
      db.ref("name").withSchema(TableName.AppConnection).as("connectionName"),
      db.ref("method").withSchema(TableName.AppConnection).as("connectionMethod"),
      db.ref("app").withSchema(TableName.AppConnection),
      db.ref("orgId").withSchema(TableName.AppConnection),
      db.ref("encryptedCredentials").withSchema(TableName.AppConnection)
    );

  if (filter) {
    /* eslint-disable @typescript-eslint/no-misused-promises */
    void query.where(buildFindFilter(filter));
  }

  return query;
};

const expandSecretSync = (secretSync: Awaited<ReturnType<typeof baseSecretSyncQuery>>[number]) => {
  const {
    envId,
    envName,
    envSlug,
    app,
    connectionName,
    connectionId,
    orgId,
    encryptedCredentials,
    connectionMethod,
    ...el
  } = secretSync;
  return {
    ...el,
    envId,
    connectionId,
    environment: { id: envId, name: envName, slug: envSlug },
    connection: { app, id: connectionId, name: connectionName, orgId, encryptedCredentials, method: connectionMethod }
  };
};

export const secretSyncDALFactory = (db: TDbClient) => {
  const secretSyncOrm = ormify(db, TableName.SecretSync);

  const findById = async (id: string, tx?: Knex) => {
    try {
      const secretSync = await baseSecretSyncQuery({
        filter: { [`${TableName.SecretSync}.id` as "id"]: id },
        db,
        tx
      }).first();

      if (secretSync) {
        return expandSecretSync(secretSync);
      }
    } catch (error) {
      throw new DatabaseError({ error, name: "Find by ID" });
    }
  };

  const create = async (data: Parameters<(typeof secretSyncOrm)["create"]>[0]) => {
    try {
      const secretSync = await secretSyncOrm.transaction(async (tx) => {
        const sync = await secretSyncOrm.create(data, tx);

        return baseSecretSyncQuery({
          filter: { [`${TableName.SecretSync}.id` as "id"]: sync.id },
          db,
          tx
        }).first();
      });

      return expandSecretSync(secretSync!);
    } catch (error) {
      throw new DatabaseError({ error, name: "Create" });
    }
  };

  // TODO: update

  const findOne = async (filter: Parameters<(typeof secretSyncOrm)["findOne"]>[0], tx?: Knex) => {
    try {
      const secretSync = await baseSecretSyncQuery({ filter, db, tx }).first();

      if (secretSync) {
        return expandSecretSync(secretSync);
      }
    } catch (error) {
      throw new DatabaseError({ error, name: "Find One" });
    }
  };

  const find = async (filter: Parameters<(typeof secretSyncOrm)["find"]>[0], tx?: Knex) => {
    try {
      const secretSyncs = await baseSecretSyncQuery({ filter, db, tx });

      return secretSyncs.map(expandSecretSync);
    } catch (error) {
      throw new DatabaseError({ error, name: "Find" });
    }
  };

  return { ...secretSyncOrm, findById, findOne, find, create };
};
