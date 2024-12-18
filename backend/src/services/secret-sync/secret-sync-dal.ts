import { Knex } from "knex";

import { TDbClient } from "@app/db";
import { TableName } from "@app/db/schemas";
import { TSecretSyncs } from "@app/db/schemas/secret-syncs";
import { DatabaseError } from "@app/lib/errors";
import { ormify, selectAllTableCols } from "@app/lib/knex";

export type TSecretSyncDALFactory = ReturnType<typeof secretSyncDALFactory>;

const baseSecretSyncQuery = (db: TDbClient, whereClause?: Partial<TSecretSyncs> | null, tx?: Knex) => {
  const query = (tx || db.replicaNode())(TableName.SecretSync)
    .join(TableName.Environment, `${TableName.SecretSync}.envId`, `${TableName.Environment}.id`)
    .join(TableName.AppConnection, `${TableName.SecretSync}.connectionId`, `${TableName.AppConnection}.id`)
    .select(selectAllTableCols(TableName.SecretSync))
    .select(
      db.ref("name").withSchema(TableName.Environment).as("envName"),
      db.ref("id").withSchema(TableName.Environment).as("envId"),
      db.ref("slug").withSchema(TableName.Environment).as("envSlug"),
      db.ref("name").withSchema(TableName.AppConnection).as("connectionName"),
      db.ref("app").withSchema(TableName.AppConnection)
    );

  if (whereClause) {
    void query.where(whereClause);
  }

  return query;
};

export const secretSyncDALFactory = (db: TDbClient) => {
  const secretSyncOrm = ormify(db, TableName.SecretSync);

  const findById = async (id: string, tx?: Knex) => {
    try {
      const secretSync = await baseSecretSyncQuery(db, { [`${TableName.SecretSync}.id` as "id"]: id }, tx).first();

      if (secretSync) {
        const { envId, envName, envSlug, app, connectionName, connectionId, ...el } = secretSync;
        return {
          ...el,
          envId,
          connectionId,
          environment: { id: envId, name: envName, slug: envSlug },
          connection: { app, id: connectionId, name: connectionName }
        };
      }
    } catch (error) {
      throw new DatabaseError({ error, name: "Find by ID" });
    }
  };

  const findOne = async (filter: Partial<TSecretSyncs>, tx?: Knex) => {
    try {
      const secretSync = await baseSecretSyncQuery(db, filter, tx).first();

      if (secretSync) {
        const { envId, envName, envSlug, app, connectionName, connectionId, ...el } = secretSync;
        return {
          ...el,
          envId,
          connectionId,
          environment: { id: envId, name: envName, slug: envSlug },
          connection: { app, id: connectionId, name: connectionName }
        };
      }
    } catch (error) {
      throw new DatabaseError({ error, name: "Find One" });
    }
  };

  const find = async (filter: Partial<TSecretSyncs>, tx?: Knex) => {
    try {
      const secretSyncs = await baseSecretSyncQuery(db, filter, tx);

      return secretSyncs.map(({ envId, envName, envSlug, app, connectionName, connectionId, ...el }) => ({
        ...el,
        envId,
        connectionId,
        environment: { id: envId, name: envName, slug: envSlug },
        connection: { app, id: connectionId, name: connectionName }
      }));
    } catch (error) {
      throw new DatabaseError({ error, name: "Find" });
    }
  };

  return { ...secretSyncOrm, findById, findOne, find };
};
