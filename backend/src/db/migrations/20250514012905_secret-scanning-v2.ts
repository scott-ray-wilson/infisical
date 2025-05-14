import { Knex } from "knex";

import { TableName } from "@app/db/schemas";
import { createOnUpdateTrigger, dropOnUpdateTrigger } from "@app/db/utils";
import { SecretScanningFindingStatus } from "@app/ee/services/secret-scanning-v2/secret-scanning-v2-enums";

export async function up(knex: Knex): Promise<void> {
  if (!(await knex.schema.hasTable(TableName.SecretScanningSource))) {
    await knex.schema.createTable(TableName.SecretScanningSource, (t) => {
      t.uuid("id", { primaryKey: true }).defaultTo(knex.fn.uuid());
      t.string("name", 32).notNullable();
      t.string("description");
      t.string("type").notNullable();
      t.jsonb("config").notNullable();
      t.uuid("connectionId");
      t.foreign("connectionId").references("id").inTable(TableName.AppConnection);
      t.string("projectId").notNullable();
      t.foreign("projectId").references("id").inTable(TableName.Project).onDelete("CASCADE");
      t.timestamps(true, true, true);
      t.unique(["projectId", "name"]);
    });
    await createOnUpdateTrigger(knex, TableName.SecretScanningSource);
  }

  if (!(await knex.schema.hasTable(TableName.SecretScanningTarget))) {
    await knex.schema.createTable(TableName.SecretScanningTarget, (t) => {
      t.uuid("id", { primaryKey: true }).defaultTo(knex.fn.uuid());
      t.string("externalId").notNullable();
      t.string("name").notNullable();
      t.string("type").notNullable();
      t.uuid("sourceId").notNullable();
      t.foreign("sourceId").references("id").inTable(TableName.SecretScanningSource).onDelete("CASCADE");
      t.timestamps(true, true, true);
    });
    await createOnUpdateTrigger(knex, TableName.SecretScanningTarget);
  }

  if (!(await knex.schema.hasTable(TableName.SecretScanningScan))) {
    await knex.schema.createTable(TableName.SecretScanningScan, (t) => {
      t.uuid("id", { primaryKey: true }).defaultTo(knex.fn.uuid());
      t.string("status").notNullable();
      t.string("type").notNullable();
      t.uuid("targetId").notNullable();
      t.foreign("targetId").references("id").inTable(TableName.SecretScanningTarget).onDelete("CASCADE");
      t.timestamp("createdAt").defaultTo(knex.fn.now());
    });
  }

  if (!(await knex.schema.hasTable(TableName.SecretScanningFinding))) {
    await knex.schema.createTable(TableName.SecretScanningFinding, (t) => {
      t.uuid("id", { primaryKey: true }).defaultTo(knex.fn.uuid());
      t.string("sourceName").notNullable();
      t.string("sourceType").notNullable();
      t.string("targetName").notNullable();
      t.string("targetType").notNullable();
      t.string("rule").notNullable();
      t.string("severity").notNullable();
      t.string("status").notNullable().defaultTo(SecretScanningFindingStatus.Unresolved);
      t.string("remarks").notNullable();
      t.string("fingerprint").notNullable();
      t.jsonb("details").notNullable();
      t.string("projectId").notNullable();
      t.foreign("projectId").references("id").inTable(TableName.Project).onDelete("CASCADE");
      t.uuid("scanId");
      t.foreign("scanId").references("id").inTable(TableName.SecretScanningScan).onDelete("SET NULL");
      t.timestamps(true, true, true);
    });
    await createOnUpdateTrigger(knex, TableName.SecretScanningFinding);
  }

  // TODO: Rules
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists(TableName.SecretScanningFinding);

  await dropOnUpdateTrigger(knex, TableName.SecretScanningFinding);
  await knex.schema.dropTableIfExists(TableName.SecretScanningScan);

  await knex.schema.dropTableIfExists(TableName.SecretScanningTarget);
  await dropOnUpdateTrigger(knex, TableName.SecretScanningTarget);

  await knex.schema.dropTableIfExists(TableName.SecretScanningSource);
  await dropOnUpdateTrigger(knex, TableName.SecretScanningSource);
}
