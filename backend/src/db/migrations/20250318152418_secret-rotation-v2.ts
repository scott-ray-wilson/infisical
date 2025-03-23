import { Knex } from "knex";

import { TableName } from "@app/db/schemas";
import { createOnUpdateTrigger, dropOnUpdateTrigger } from "@app/db/utils";

export async function up(knex: Knex): Promise<void> {
  if (!(await knex.schema.hasTable(TableName.SecretRotationV2))) {
    await knex.schema.createTable(TableName.SecretRotationV2, (t) => {
      t.uuid("id", { primaryKey: true }).defaultTo(knex.fn.uuid());
      t.string("name", 32).notNullable();
      t.string("description");
      t.string("type").notNullable();
      t.integer("interval").notNullable();
      t.jsonb("parameters").notNullable();
      t.binary("encryptedGeneratedCredentials").notNullable();
      t.boolean("isAutoRotationEnabled").notNullable().defaultTo(true);
      t.integer("activeIndex").notNullable().defaultTo(0);
      // we're including projectId in addition to folder ID because we allow folderId to be null (if the folder
      // is deleted), to preserve configuration
      // t.string("projectId").notNullable();
      // t.foreign("projectId").references("id").inTable(TableName.Project).onDelete("CASCADE");
      t.uuid("folderId").notNullable();
      t.foreign("folderId").references("id").inTable(TableName.SecretFolder).onDelete("CASCADE");
      t.uuid("connectionId").notNullable();
      t.foreign("connectionId").references("id").inTable(TableName.AppConnection);
      t.timestamps(true, true, true);
      t.string("rotationStatus");
      t.string("rotationStatusMessage", 1024);
      t.string("lastRotationJobId");
      t.datetime("lastRotatedAt");
    });

    await createOnUpdateTrigger(knex, TableName.SecretRotationV2);

    await knex.schema.alterTable(TableName.SecretRotationV2, (t) => {
      t.unique(["folderId", "name"]);
    });
  }

  if (!(await knex.schema.hasTable(TableName.SecretRotationV2SecretMapping))) {
    await knex.schema.createTable(TableName.SecretRotationV2SecretMapping, (t) => {
      t.uuid("id", { primaryKey: true }).defaultTo(knex.fn.uuid());
      t.string("secretKey").notNullable();
      t.uuid("secretId").notNullable();
      t.foreign("secretId").references("id").inTable(TableName.SecretV2).deferrable("deferred");
      t.uuid("rotationId").notNullable();
      t.foreign("rotationId").references("id").inTable(TableName.SecretRotationV2).onDelete("CASCADE");
    });
  }
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists(TableName.SecretRotationV2SecretMapping);
  await knex.schema.dropTableIfExists(TableName.SecretRotationV2);
  await dropOnUpdateTrigger(knex, TableName.SecretRotationV2);
}
