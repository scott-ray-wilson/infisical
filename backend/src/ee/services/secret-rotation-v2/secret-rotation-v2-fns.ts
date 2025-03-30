import { AxiosError } from "axios";
import { addDays, addMinutes } from "date-fns";

import { getConfig } from "@app/lib/config/env";
import { KmsDataKey } from "@app/services/kms/kms-types";

import { MSSQL_CREDENTIALS_ROTATION_LIST_OPTION } from "./mssql-credentials";
import { POSTGRES_CREDENTIALS_ROTATION_LIST_OPTION } from "./postgres-credentials";
import { SecretRotation, SecretRotationStatus } from "./secret-rotation-v2-enums";
import { TSecretRotationV2ServiceFactoryDep } from "./secret-rotation-v2-service";
import {
  TSecretRotationV2,
  TSecretRotationV2GeneratedCredentials,
  TSecretRotationV2ListItem,
  TSecretRotationV2Raw
} from "./secret-rotation-v2-types";

const SECRET_ROTATION_LIST_OPTIONS: Record<SecretRotation, TSecretRotationV2ListItem> = {
  [SecretRotation.PostgresCredentials]: POSTGRES_CREDENTIALS_ROTATION_LIST_OPTION,
  [SecretRotation.MsSqlCredentials]: MSSQL_CREDENTIALS_ROTATION_LIST_OPTION
};

export const listSecretRotationOptions = () => {
  return Object.values(SECRET_ROTATION_LIST_OPTIONS).sort((a, b) => a.name.localeCompare(b.name));
};

export const getRotateAt = ({ hours, minutes }: TSecretRotationV2["rotateAtUtc"], currentTime: Date) => {
  const appCfg = getConfig();

  return new Date(
    Date.UTC(
      currentTime.getUTCFullYear(),
      currentTime.getUTCMonth(),
      currentTime.getUTCDate(),
      appCfg.isRotationDevelopmentMode ? currentTime.getUTCHours() : hours,
      appCfg.isRotationDevelopmentMode ? currentTime.getUTCMinutes() : minutes,
      appCfg.isRotationDevelopmentMode ? minutes : 0,
      0
    )
  );
};

export const getNextUTCMidnight = (date: Date = new Date()) =>
  new Date(
    Date.UTC(
      date.getUTCFullYear(),
      date.getUTCMonth(),
      date.getUTCDate() + 1, // Add 1 day to get tomorrow
      0,
      0,
      0,
      0
    )
  );

export const getNextUTCMinute = (date: Date = new Date()) =>
  new Date(
    Date.UTC(
      date.getUTCFullYear(),
      date.getUTCMonth(),
      date.getUTCDate(),
      date.getUTCHours(),
      date.getUTCMinutes() + 1, // Add 1 minute to get the next minute
      0,
      0
    )
  );

export const encryptSecretRotationCredentials = async ({
  projectId,
  generatedCredentials,
  kmsService
}: {
  projectId: string;
  generatedCredentials: TSecretRotationV2GeneratedCredentials;
  kmsService: TSecretRotationV2ServiceFactoryDep["kmsService"];
}) => {
  const { encryptor } = await kmsService.createCipherPairWithDataKey({
    type: KmsDataKey.SecretManager,
    projectId
  });

  const { cipherTextBlob: encryptedCredentialsBlob } = encryptor({
    plainText: Buffer.from(JSON.stringify(generatedCredentials))
  });

  return encryptedCredentialsBlob;
};

export const decryptSecretRotationCredentials = async ({
  projectId,
  encryptedGeneratedCredentials,
  kmsService
}: {
  projectId: string;
  encryptedGeneratedCredentials: Buffer;
  kmsService: TSecretRotationV2ServiceFactoryDep["kmsService"];
}) => {
  const { decryptor } = await kmsService.createCipherPairWithDataKey({
    type: KmsDataKey.SecretManager,
    projectId
  });

  const decryptedPlainTextBlob = decryptor({
    cipherTextBlob: encryptedGeneratedCredentials
  });

  return JSON.parse(decryptedPlainTextBlob.toString()) as TSecretRotationV2GeneratedCredentials;
};

export const expandSecretRotation = async (
  { encryptedLastRotationMessage, ...secretRotation }: TSecretRotationV2Raw,
  kmsService: TSecretRotationV2ServiceFactoryDep["kmsService"]
) => {
  const appCfg = getConfig();

  const { decryptor } = await kmsService.createCipherPairWithDataKey({
    type: KmsDataKey.SecretManager,
    projectId: secretRotation.projectId
  });

  const lastRotationMessage = encryptedLastRotationMessage
    ? decryptor({
        cipherTextBlob: encryptedLastRotationMessage
      }).toString()
    : null;

  const { rotateAtUtc, rotationStatus, rotationInterval, isLastRotationManual, lastRotatedAt } = secretRotation;

  const modifier = appCfg.isRotationDevelopmentMode ? addMinutes : addDays;

  const nextUtcInterval = getRotateAt(
    rotateAtUtc as TSecretRotationV2["rotateAtUtc"],
    appCfg.isRotationDevelopmentMode ? getNextUTCMinute() : getNextUTCMidnight()
  );

  const rotateAt = getRotateAt(
    rotateAtUtc as TSecretRotationV2["rotateAtUtc"],
    modifier(
      lastRotatedAt,
      rotationInterval + (isLastRotationManual ? 1 : 0) // pad full interval if manually rotated or just created
    )
  );

  return {
    ...secretRotation,
    lastRotationMessage,
    // eslint-disable-next-line no-nested-ternary
    nextRotationAt: secretRotation.isAutoRotationEnabled
      ? // we also check time in addition to status because service outages or if it was previously disabled
        rotationStatus === SecretRotationStatus.Success && rotateAt.getTime() > nextUtcInterval.getTime()
        ? rotateAt
        : nextUtcInterval
      : null
  } as TSecretRotationV2;
};

const MAX_MESSAGE_LENGTH = 1024;

export const parseRotationErrorMessage = (err: unknown): string => {
  let errorMessage = `Infisical encountered an issue while generating credentials with the configured inputs: `;

  if (err instanceof AxiosError) {
    errorMessage += err?.response?.data
      ? JSON.stringify(err?.response?.data)
      : err?.message ?? "An unknown error occurred.";
  } else {
    errorMessage += (err as Error)?.message || "An unknown error occurred.";
  }

  return errorMessage.length <= MAX_MESSAGE_LENGTH
    ? errorMessage
    : `${errorMessage.substring(0, MAX_MESSAGE_LENGTH - 3)}...`;
};
