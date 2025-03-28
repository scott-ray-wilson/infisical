import { randomInt } from "crypto";
import { Knex } from "knex";

import {
  TRotationFactoryGetSecretsPayload,
  TRotationFactoryIssueCredentials,
  TRotationFactoryRevokeCredentials,
  TRotationFactoryRotateCredentials
} from "@app/ee/services/secret-rotation-v2/secret-rotation-v2-types";
import { AppConnection } from "@app/services/app-connection/app-connection-enums";
import { getSqlConnectionClient } from "@app/services/app-connection/shared/sql";

import {
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

const SqlStatementMap: Record<
  TSqlCredentialsRotationWithConnection["connection"]["app"],
  (credentials: TSqlCredentialsRotationGeneratedCredentials[number]) => [string, Knex.RawBinding]
> = {
  [AppConnection.Postgres]: ({ username, password }) => [`ALTER USER ?? WITH PASSWORD '${password}';`, [username]],
  [AppConnection.MsSql]: ({ username, password }) => [`ALTER USER ?? WITH PASSWORD '${password}';`, [username]]
};

export const sqlCredentialsRotationFactory = (secretRotation: TSqlCredentialsRotationWithConnection) => {
  const {
    connection,
    parameters: { username1, username2 },
    activeIndex,
    secretsMapping
  } = secretRotation;

  const validateCredentials = async ({ username, password }: TSqlCredentialsRotationGeneratedCredentials[number]) => {
    const client = await getSqlConnectionClient({
      ...connection,
      credentials: {
        ...connection.credentials,
        username,
        password
      }
    });

    try {
      await client.raw("SELECT 1");
    } finally {
      await client.destroy();
    }
  };

  const issueCredentials: TRotationFactoryIssueCredentials = async (callback) => {
    const client = await getSqlConnectionClient(connection);

    // For SQL, since we get existing users, we change both their passwords
    // on issue to invalidate their existing passwords
    const credentialsSet = [
      { username: username1, password: generatePassword() },
      { username: username2, password: generatePassword() }
    ];

    try {
      return await client.transaction(async (tx) => {
        for await (const credentials of credentialsSet) {
          await tx.raw(...SqlStatementMap[connection.app](credentials));
        }
        return callback(credentialsSet[0]);
      });
    } finally {
      await client.destroy();
    }
  };

  const revokeCredentials: TRotationFactoryRevokeCredentials = async (credentialsToRevoke, callback) => {
    const client = await getSqlConnectionClient(connection);

    try {
      return await client.transaction(async (tx) => {
        for await (const { username } of credentialsToRevoke) {
          // scott: invalidate previous passwords; alternatively we could drop the users but unless the
          // master connection has these permissions it may fail
          await tx.raw(...SqlStatementMap[connection.app]({ username, password: generatePassword() }));
        }
        return callback();
      });
    } finally {
      await client.destroy();
    }
  };

  const rotateCredentials: TRotationFactoryRotateCredentials = async (_, callback) => {
    const client = await getSqlConnectionClient(connection);

    // generate new password for the next active user
    const credentials = { username: activeIndex === 0 ? username2 : username1, password: generatePassword() };

    try {
      return await client.transaction(async (tx) => {
        await tx.raw(...SqlStatementMap[connection.app](credentials));
        return callback(credentials);
      });
    } finally {
      await client.destroy();
    }
  };

  const getSecretsPayload: TRotationFactoryGetSecretsPayload = (generatedCredentials) => {
    const { username, password } = secretsMapping;

    const secrets = [
      {
        key: username,
        value: generatedCredentials.username
      },
      {
        key: password,
        value: generatedCredentials.password
      }
    ];

    return secrets;
  };

  return {
    issueCredentials,
    revokeCredentials,
    rotateCredentials,
    getSecretsPayload,
    validateCredentials
  };
};
