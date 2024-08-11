import { useQuery, UseQueryOptions } from "@tanstack/react-query";

import {
  decryptAssymmetric,
  decryptSymmetric
} from "@app/components/utilities/cryptography/crypto";
import { apiRequest } from "@app/config/request";
import { UserConsumerKeyPair } from "@app/hooks/api/consumer-keys/types";
import {
  DecryptedConsumerSecret,
  EncryptedConsumerSecret,
  TGetConsumerSecretsDTO,
  TGetConsumerSecretsKey
} from "@app/hooks/api/consumer-secrets/types";

export const consumerSecretKeys = {
  getConsumerSecrets: ({ orgId }: TGetConsumerSecretsKey) => ["consumer-secrets", orgId] as const
};

export const decryptConsumerSecrets = (
  encryptedSecrets: EncryptedConsumerSecret[],
  decryptConsumerKey: UserConsumerKeyPair
) => {
  const PRIVATE_KEY = localStorage.getItem("PRIVATE_KEY") as string;
  const key = decryptAssymmetric({
    ciphertext: decryptConsumerKey.encryptedKey,
    nonce: decryptConsumerKey.nonce,
    publicKey: decryptConsumerKey.sender.publicKey,
    privateKey: PRIVATE_KEY
  });

  const secrets: DecryptedConsumerSecret[] = [];

  encryptedSecrets.forEach((encSecret) => {
    const secretName = decryptSymmetric({
      ciphertext: encSecret.secretNameCiphertext,
      iv: encSecret.secretNameIV,
      tag: encSecret.secretNameTag,
      key
    });

    const secretFieldOne = decryptSymmetric({
      ciphertext: encSecret.secretFieldOneCiphertext,
      iv: encSecret.secretFieldOneIV,
      tag: encSecret.secretFieldOneTag,
      key
    });

    const secretFieldTwo = decryptSymmetric({
      ciphertext: encSecret.secretFieldTwoCiphertext,
      iv: encSecret.secretFieldTwoIV,
      tag: encSecret.secretFieldTwoTag,
      key
    });

    const secretFieldThree = decryptSymmetric({
      ciphertext: encSecret.secretFieldThreeCiphertext,
      iv: encSecret.secretFieldThreeIV,
      tag: encSecret.secretFieldThreeTag,
      key
    });

    const secretFieldFour = decryptSymmetric({
      ciphertext: encSecret.secretFieldFourCiphertext,
      iv: encSecret.secretFieldFourIV,
      tag: encSecret.secretFieldFourTag,
      key
    });

    const decryptedSecret: DecryptedConsumerSecret = {
      id: encSecret.id,
      type: encSecret.type,
      secretName,
      secretFieldOne,
      secretFieldTwo,
      secretFieldThree,
      secretFieldFour,
      createdAt: encSecret.createdAt,
      updatedAt: encSecret.updatedAt,
      skipMultilineEncoding: encSecret.skipMultilineEncoding
    };

    secrets.push(decryptedSecret);
  });

  return secrets;
};

export const fetchEncryptedConsumerSecrets = async ({ orgId }: TGetConsumerSecretsKey) => {
  const { data } = await apiRequest.get<{ consumerSecrets: EncryptedConsumerSecret[] }>(
    `/api/v1/consumer-secrets/${orgId}`
  );

  return data.consumerSecrets;
};

export const useGetConsumerSecrets = ({
  orgId,
  decryptConsumerKey,
  options
}: TGetConsumerSecretsDTO & {
  options?: Omit<
    UseQueryOptions<
      EncryptedConsumerSecret[],
      unknown,
      DecryptedConsumerSecret[],
      ReturnType<typeof consumerSecretKeys.getConsumerSecrets>
    >,
    "queryKey" | "queryFn"
  >;
}) =>
  useQuery({
    ...options,
    // wait for all values to be available
    enabled: Boolean(decryptConsumerKey && orgId) && (options?.enabled ?? true),
    queryKey: consumerSecretKeys.getConsumerSecrets({ orgId }),
    queryFn: async () => fetchEncryptedConsumerSecrets({ orgId }),
    select: (secrets: EncryptedConsumerSecret[]) =>
      decryptConsumerSecrets(secrets, decryptConsumerKey)
  });
