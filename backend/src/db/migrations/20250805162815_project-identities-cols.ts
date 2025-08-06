import { Knex } from "knex";

import { TableName } from "../schemas";

export async function up(knex: Knex): Promise<void> {
  const hasProjectIdCol = await knex.schema.hasColumn(TableName.Identity, "projectId");
  const hasOrgIdCol = await knex.schema.hasColumn(TableName.Identity, "orgId");

  if (!hasProjectIdCol || !hasOrgIdCol) {
    await knex.schema.alterTable(TableName.Identity, (table) => {
      if (!hasProjectIdCol) {
        table.string("projectId").nullable();
        table.foreign("projectId").references("id").inTable(TableName.Project).onDelete("CASCADE");
      }

      if (!hasOrgIdCol) {
        table.uuid("orgId").nullable(); // nullable is temp until populated below
        table.foreign("orgId").references("id").inTable(TableName.Organization).onDelete("CASCADE");
      }
    });

    if (!hasOrgIdCol) {
      await knex.raw(`
        UPDATE ${TableName.Identity} i
        SET "orgId" = iom."orgId"
        FROM ${TableName.IdentityOrgMembership} iom
        WHERE i.id = iom."identityId"
      `);

      // Make orgId required after populating it
      await knex.schema.alterTable(TableName.Identity, (table) => {
        table.uuid("orgId").notNullable().alter();
      });
    }
  }
}

export async function down(knex: Knex): Promise<void> {
  const hasProjectIdCol = await knex.schema.hasColumn(TableName.Identity, "projectId");
  const hasOrgIdCol = await knex.schema.hasColumn(TableName.Identity, "orgId");

  if (hasOrgIdCol || hasProjectIdCol) {
    await knex.schema.alterTable(TableName.Identity, (table) => {
      if (hasProjectIdCol) table.dropColumn("projectId");
      if (hasOrgIdCol) table.dropColumn("orgId");
    });
  }
}
