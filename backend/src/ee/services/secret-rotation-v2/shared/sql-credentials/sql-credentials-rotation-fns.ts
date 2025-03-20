import { randomInt } from "crypto";
import handlebars from "handlebars";
import { Knex } from "knex";

import { TPostgresCredentialsRotationGeneratedCredentials } from "@app/ee/services/secret-rotation-v2/postgres-credentials";
import { TSqlCredentialsRotationWithConnection } from "@app/ee/services/secret-rotation-v2/shared/sql-credentials/sql-credentials-rotation-types";
import { alphaNumericNanoId } from "@app/lib/nanoid";
import { getSqlConnectionClient } from "@app/services/app-connection/shared/sql";

const DEFAULT_PASSWORD_REQUIREMENTS = {
  length: 48,
  required: {
    lowercase: 1,
    uppercase: 1,
    digits: 1,
    symbols: 0
  },
  allowedSymbols: "-_.~!*"
};

const generatePassword = () => {
  try {
    const { length, required, allowedSymbols } = DEFAULT_PASSWORD_REQUIREMENTS;

    const chars = {
      lowercase: "abcdefghijklmnopqrstuvwxyz",
      uppercase: "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
      digits: "0123456789",
      symbols: allowedSymbols || "-_.~!*"
    };

    const parts: string[] = [];

    if (required.lowercase > 0) {
      parts.push(
        ...Array(required.lowercase)
          .fill(0)
          .map(() => chars.lowercase[randomInt(chars.lowercase.length)])
      );
    }

    if (required.uppercase > 0) {
      parts.push(
        ...Array(required.uppercase)
          .fill(0)
          .map(() => chars.uppercase[randomInt(chars.uppercase.length)])
      );
    }

    if (required.digits > 0) {
      parts.push(
        ...Array(required.digits)
          .fill(0)
          .map(() => chars.digits[randomInt(chars.digits.length)])
      );
    }

    if (required.symbols > 0) {
      parts.push(
        ...Array(required.symbols)
          .fill(0)
          .map(() => chars.symbols[randomInt(chars.symbols.length)])
      );
    }

    const requiredTotal = Object.values(required).reduce<number>((a, b) => a + b, 0);
    const remainingLength = Math.max(length - requiredTotal, 0);

    const allowedChars = Object.entries(chars)
      .filter(([key]) => required[key as keyof typeof required] > 0)
      .map(([, value]) => value)
      .join("");

    parts.push(
      ...Array(remainingLength)
        .fill(0)
        .map(() => allowedChars[randomInt(allowedChars.length)])
    );

    // shuffle the array to mix up the characters
    for (let i = parts.length - 1; i > 0; i -= 1) {
      const j = randomInt(i + 1);
      [parts[i], parts[j]] = [parts[j], parts[i]];
    }

    return parts.join("");
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    throw new Error(`Failed to generate password: ${message}`);
  }
};

const processStatement = async (statement: string, client: Knex) => {
  const queries = statement.split(";").filter(Boolean);

  await client.transaction(async (tx) => {
    for await (const query of queries) {
      await tx.raw(query);
    }
  });
};

const getUsernameAndPassword = () => {
  const username = alphaNumericNanoId(32);
  const password = generatePassword();

  return { username, password };
};

export const sqlCredentialsRotationFactory = (
  rotation: Pick<TSqlCredentialsRotationWithConnection, "connection" | "parameters">
) => {
  const issue = async () => {
    const {
      connection,
      parameters: { issueStatement }
    } = rotation;

    const { username, password } = getUsernameAndPassword();

    const client = await getSqlConnectionClient(connection);

    try {
      const issueCredentialsStatement = handlebars.compile(issueStatement, { noEscape: true })({
        username,
        password
      });

      await processStatement(issueCredentialsStatement, client);

      return { username, password };
    } finally {
      await client.destroy();
    }
  };

  const revoke = async (generatedCredentials: TPostgresCredentialsRotationGeneratedCredentials[number]) => {
    const {
      connection,
      parameters: { revokeStatement }
    } = rotation;

    const client = await getSqlConnectionClient(connection);

    try {
      const revokeCredentialsStatement = handlebars.compile(revokeStatement, { noEscape: true })({
        username: generatedCredentials.username
      });

      await processStatement(revokeCredentialsStatement, client);
    } finally {
      await client.destroy();
    }
  };

  const rotate = async (generatedCredentials?: TPostgresCredentialsRotationGeneratedCredentials[number]) => {
    const {
      connection,
      parameters: { revokeStatement, issueStatement }
    } = rotation;

    const client = await getSqlConnectionClient(connection);

    const { username, password } = getUsernameAndPassword();

    try {
      let issueCredentialsStatement = handlebars
        .compile(issueStatement, { noEscape: true })({
          username,
          password
        })
        .trim();

      if (!issueCredentialsStatement.endsWith(";")) {
        issueCredentialsStatement += ";";
      }

      const revokeCredentialsStatement = generatedCredentials
        ? handlebars
            .compile(revokeStatement, { noEscape: true })({
              username: generatedCredentials.username
            })
            .trim()
        : "";

      await processStatement(`${issueCredentialsStatement}${revokeCredentialsStatement}`, client);

      return { username, password };
    } finally {
      await client.destroy();
    }
  };

  return { issue, revoke, rotate };
};
