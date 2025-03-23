import { randomInt } from "crypto";
import handlebars from "handlebars";
import { Knex } from "knex";

import { SecretType } from "@app/db/schemas";
import { DatabaseError } from "@app/lib/errors";
import { logger } from "@app/lib/logger";
import { alphaNumericNanoId } from "@app/lib/nanoid";
import { getSqlConnectionClient } from "@app/services/app-connection/shared/sql";

import {
  TSqlCredentialsRotation,
  TSqlCredentialsRotationGeneratedCredentials,
  TSqlCredentialsRotationWithConnection
} from "./sql-credentials-rotation-types";

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

const VALIDATION_PASSED_MESSAGE = "Validation passed";

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

const processStatements = async (statement: string, client: Knex, callback: () => Promise<TSqlCredentialsRotation>) => {
  const queries = statement.split(";").filter(Boolean);

  const rotation = await client.transaction(async (tx) => {
    for await (const query of queries) {
      try {
        await tx.raw(query);
      } catch (error) {
        throw new DatabaseError({ error, name: "Process Secret Rotation SQL Statements" });
      }
    }
    // update is done as callback to rollback issuance or revocation of credentials if update fails
    const updatedRotation = await callback();

    return updatedRotation;
  });

  return rotation;
};

const getUsernameAndPassword = () => {
  const username = alphaNumericNanoId(32);
  const password = generatePassword();

  return { username, password };
};

export const sqlCredentialsRotationFactory = (
  rotationConfig: Pick<TSqlCredentialsRotationWithConnection, "connection" | "parameters">
) => {
  const issue = async (
    callback: (newCredentials: TSqlCredentialsRotationGeneratedCredentials[number]) => Promise<TSqlCredentialsRotation>
  ) => {
    const {
      connection,
      parameters: { issueStatement }
    } = rotationConfig;

    const { username, password } = getUsernameAndPassword();

    const client = await getSqlConnectionClient(connection);

    try {
      const issueCredentialsStatement = handlebars.compile(issueStatement, { noEscape: true })({
        username,
        password
      });

      const secretRotation = await processStatements(issueCredentialsStatement, client, async () =>
        callback({ username, password })
      );

      return secretRotation;
    } finally {
      await client.destroy();
    }
  };

  const revoke = async (
    credentialsToRevoke: TSqlCredentialsRotationGeneratedCredentials,
    callback: () => Promise<TSqlCredentialsRotation>
  ) => {
    const {
      connection,
      parameters: { revokeStatement }
    } = rotationConfig;

    const client = await getSqlConnectionClient(connection);

    try {
      let revokeStatements = "";

      credentialsToRevoke.forEach((credentials) => {
        revokeStatements += handlebars.compile(revokeStatement, { noEscape: true })({
          username: credentials.username
        });
      });
      logger.warn(revokeStatements);
      const secretRotation = await processStatements(revokeStatements, client, async () => callback());

      return secretRotation;
    } finally {
      await client.destroy();
    }
  };

  const rotate = async (
    credentialsToRevoke: TSqlCredentialsRotationGeneratedCredentials[number] | undefined,
    callback: (newCredentials: TSqlCredentialsRotationGeneratedCredentials[number]) => Promise<TSqlCredentialsRotation>
  ) => {
    const {
      connection,
      parameters: { revokeStatement, issueStatement }
    } = rotationConfig;

    const client = await getSqlConnectionClient(connection);

    const { username, password } = getUsernameAndPassword();

    try {
      const issueCredentialsStatement = handlebars
        .compile(issueStatement, { noEscape: true })({
          username,
          password
        })
        .trim();

      // TODO: see if needed
      // if (!issueCredentialsStatement.endsWith(";")) {
      //   issueCredentialsStatement += ";";
      // }

      const revokeCredentialsStatement = credentialsToRevoke
        ? handlebars
            .compile(revokeStatement, { noEscape: true })({
              username: credentialsToRevoke.username
            })
            .trim()
        : // no credentials to revoke on first rotation
          "";

      const secretRotation = await processStatements(
        `${issueCredentialsStatement}${revokeCredentialsStatement}`,
        client,
        async () => callback({ username, password })
      );

      return secretRotation;
    } finally {
      await client.destroy();
    }
  };

  const throwOnInvalidParameters = async () => {
    const {
      connection,
      parameters: { issueStatement, revokeStatement } // username and password are validated at API-level
    } = rotationConfig;

    const client = await getSqlConnectionClient(connection);

    // these are not commited, just using them to validate SQL syntax
    const { username, password } = getUsernameAndPassword();

    const issueCredentialsStatement = handlebars.compile(issueStatement, { noEscape: true })({
      username,
      password
    });

    const revokeCredentialsStatement = handlebars.compile(revokeStatement, { noEscape: true })({
      username
    });

    try {
      await client.transaction(async (tx) => {
        await tx.raw(issueCredentialsStatement);
        await tx.raw(revokeCredentialsStatement);
        throw new Error(VALIDATION_PASSED_MESSAGE);
      });
    } catch (error) {
      if ((error as Error).message !== VALIDATION_PASSED_MESSAGE) {
        throw new DatabaseError({ error, name: "Validate Secret Rotation SQL Statements" });
      }
    }
  };

  const formatActiveCredentialsAsSecrets = (
    secretRotation: TSqlCredentialsRotation,
    generatedCredentials: TSqlCredentialsRotationGeneratedCredentials
  ) => {
    const {
      parameters: { usernameSecretKey, passwordSecretKey },
      activeIndex
    } = secretRotation;

    const secrets = [
      {
        secretName: usernameSecretKey,
        secretValue: generatedCredentials[activeIndex].username,
        type: SecretType.Shared
      },
      {
        secretName: passwordSecretKey,
        secretValue: generatedCredentials[activeIndex].password,
        type: SecretType.Shared
      }
    ];

    return secrets;
  };

  return { issue, revoke, rotate, formatActiveCredentialsAsSecrets, throwOnInvalidParameters };
};
