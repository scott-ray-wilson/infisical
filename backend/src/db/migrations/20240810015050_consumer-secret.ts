import { Knex } from "knex";

import { SecretEncryptionAlgo, SecretKeyEncoding, TableName } from "@app/db/schemas";
import { createOnUpdateTrigger, dropOnUpdateTrigger } from "@app/db/utils";

export async function up(knex: Knex): Promise<void> {
  // TODO: blind index and versioning

  if (!(await knex.schema.hasTable(TableName.ConsumerSecret))) {
    await knex.schema.createTable(TableName.ConsumerSecret, (t) => {
      t.uuid("id", { primaryKey: true }).defaultTo(knex.fn.uuid());
      // t.integer("version").defaultTo(1).notNullable();
      t.string("type").notNullable(); // login, cc, not, etc.
      t.text("secretNameCiphertext").notNullable();
      t.text("secretNameIV").notNullable();
      t.text("secretNameTag").notNullable();
      // different types require a different amount of fields, currently support up to 4
      t.text("secretFieldOneCiphertext").notNullable();
      t.text("secretFieldOneIV").notNullable();
      t.text("secretFieldOneTag").notNullable();
      t.text("secretFieldTwoCiphertext").notNullable();
      t.text("secretFieldTwoIV").notNullable();
      t.text("secretFieldTwoTag").notNullable();
      t.text("secretFieldThreeCiphertext").notNullable();
      t.text("secretFieldThreeIV").notNullable();
      t.text("secretFieldThreeTag").notNullable();
      t.text("secretFieldFourCiphertext").notNullable();
      t.text("secretFieldFourIV").notNullable();
      t.text("secretFieldFourTag").notNullable();

      t.boolean("skipMultilineEncoding").defaultTo(false);
      t.string("algorithm").notNullable().defaultTo(SecretEncryptionAlgo.AES_256_GCM);
      t.string("keyEncoding").notNullable().defaultTo(SecretKeyEncoding.UTF8);
      t.jsonb("metadata");
      t.uuid("userId").notNullable();
      t.foreign("userId").references("id").inTable(TableName.Users).onDelete("CASCADE");
      t.uuid("orgId").notNullable();
      t.foreign("orgId").references("id").inTable(TableName.Organization).onDelete("CASCADE");
      t.timestamps(true, true, true);
    });
  }
  await createOnUpdateTrigger(knex, TableName.ConsumerSecret);

  // consumer key (org level key per user)
  if (!(await knex.schema.hasTable(TableName.ConsumerKey))) {
    await knex.schema.createTable(TableName.ConsumerKey, (t) => {
      t.uuid("id", { primaryKey: true }).defaultTo(knex.fn.uuid());
      t.text("encryptedKey").notNullable();
      t.text("nonce").notNullable();
      t.uuid("receiverId").notNullable();
      t.foreign("receiverId").references("id").inTable(TableName.Users).onDelete("CASCADE");
      t.uuid("senderId");
      // if sender is deleted just don't do anything to this record
      t.foreign("senderId").references("id").inTable(TableName.Users).onDelete("SET NULL");
      t.uuid("orgId").notNullable();
      t.foreign("orgId").references("id").inTable(TableName.Organization).onDelete("CASCADE");
      t.timestamps(true, true, true);
    });
  }
  await createOnUpdateTrigger(knex, TableName.ConsumerKey);
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists(TableName.ConsumerSecret);
  await dropOnUpdateTrigger(knex, TableName.ConsumerSecret);
  await knex.schema.dropTableIfExists(TableName.ConsumerKey);
  await dropOnUpdateTrigger(knex, TableName.ConsumerKey);
}
