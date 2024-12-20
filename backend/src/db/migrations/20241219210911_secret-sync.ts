import { Knex } from "knex";

import { TableName } from "@app/db/schemas";
import { createOnUpdateTrigger, dropOnUpdateTrigger } from "@app/db/utils";

export async function up(knex: Knex): Promise<void> {
  if (!(await knex.schema.hasTable(TableName.SecretSync))) {
    await knex.schema.createTable(TableName.SecretSync, (t) => {
      t.uuid("id", { primaryKey: true }).defaultTo(knex.fn.uuid());
      t.string("name", 32).notNullable();
      t.string("description");
      t.boolean("isActive").notNullable().defaultTo(true);
      t.integer("version").defaultTo(1).notNullable();
      t.enum("syncState", ["pending", "complete", "failed"]).notNullable().defaultTo("pending");
      t.jsonb("destinationConfig").notNullable();
      t.jsonb("syncConfig").notNullable();
      t.string("secretPath").notNullable();
      t.uuid("envId").notNullable();
      t.foreign("envId").references("id").inTable(TableName.Environment).onDelete("CASCADE");
      t.uuid("connectionId").notNullable();
      t.foreign("connectionId").references("id").inTable(TableName.AppConnection);
      t.string("lastSyncJobId");
      t.string("lastSyncMessage");
      t.datetime("lastSyncedAt");
      t.timestamps(true, true, true);
    });

    await createOnUpdateTrigger(knex, TableName.SecretSync);
  }
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists(TableName.SecretSync);
  await dropOnUpdateTrigger(knex, TableName.SecretSync);
}
