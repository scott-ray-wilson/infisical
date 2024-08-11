import crypto from "crypto";

import { MutationOptions, useMutation, useQueryClient } from "@tanstack/react-query";

import {
  decryptAssymmetric,
  encryptSymmetric
} from "@app/components/utilities/cryptography/crypto";
import { apiRequest } from "@app/config/request";
import { consumerSecretKeys } from "@app/hooks/api/consumer-secrets/queries";
import {
  TCreateConsumerSecretDTO,
  TDeleteConsumerSecretDTO,
  TUpdateConsumerSecretDTO
} from "@app/hooks/api/consumer-secrets/types";

const encryptSecrets = (
  randomBytes: string,
  fields: Pick<
    TCreateConsumerSecretDTO,
    "secretName" | "secretFieldOne" | "secretFieldTwo" | "secretFieldThree"
  >
) => {
  const encryptedSecrets: { [key: string]: string } = {};

  Object.entries(fields).forEach(([key, value]) => {
    // encrypt fields
    const { ciphertext, iv, tag } = encryptSymmetric({
      plaintext: value,
      key: randomBytes
    });

    encryptedSecrets[`${key}Ciphertext`] = ciphertext;
    encryptedSecrets[`${key}IV`] = iv;
    encryptedSecrets[`${key}Tag`] = tag;
  });

  return encryptedSecrets;
};

export const useCreateConsumerSecret = ({
  options
}: {
  options?: Omit<MutationOptions<{}, {}, TCreateConsumerSecretDTO>, "mutationFn">;
} = {}) => {
  const queryClient = useQueryClient();
  return useMutation<{}, {}, TCreateConsumerSecretDTO>({
    mutationFn: async ({ type, orgId, latestFileKey, skipMultilineEncoding, ...secrets }) => {
      const PRIVATE_KEY = localStorage.getItem("PRIVATE_KEY") as string;

      const randomBytes = latestFileKey
        ? decryptAssymmetric({
            ciphertext: latestFileKey.encryptedKey,
            nonce: latestFileKey.nonce,
            publicKey: latestFileKey.sender.publicKey,
            privateKey: PRIVATE_KEY
          })
        : crypto.randomBytes(16).toString("hex");

      const reqBody = {
        type,
        orgId,
        ...encryptSecrets(randomBytes, secrets),
        skipMultilineEncoding
      };

      const { data } = await apiRequest.post(
        `/api/v1/consumer-secrets/${secrets.secretName}`,
        reqBody
      );
      return data;
    },
    onSuccess: (_, { orgId }) => {
      queryClient.invalidateQueries(consumerSecretKeys.getConsumerSecrets({ orgId }));
    },
    ...options
  });
};

export const useDeleteConsumerSecret = ({
  options
}: {
  options?: Omit<MutationOptions<{}, {}, TDeleteConsumerSecretDTO>, "mutationFn">;
} = {}) => {
  const queryClient = useQueryClient();
  return useMutation<{}, {}, TDeleteConsumerSecretDTO>({
    mutationFn: async ({ orgId, consumerSecretId }) => {
      const reqBody = {
        orgId
      };

      const { data } = await apiRequest.delete(
        `/api/v1/consumer-secrets/${consumerSecretId}`, // TODO: secret name once blind index implemented
        {
          data: reqBody
        }
      );
      return data;
    },
    onSuccess: (_, { orgId }) => {
      queryClient.invalidateQueries(consumerSecretKeys.getConsumerSecrets({ orgId }));
    },
    ...options
  });
};

export const useUpdateConsumerSecret = ({
  options
}: {
  options?: Omit<MutationOptions<{}, {}, TUpdateConsumerSecretDTO>, "mutationFn">;
} = {}) => {
  const queryClient = useQueryClient();
  return useMutation<{}, {}, TUpdateConsumerSecretDTO>({
    mutationFn: async ({
      consumerSecretId,
      orgId,
      latestFileKey,
      skipMultilineEncoding,
      type, // discard type for update
      ...secrets
    }) => {
      const PRIVATE_KEY = localStorage.getItem("PRIVATE_KEY") as string;

      const randomBytes = latestFileKey
        ? decryptAssymmetric({
            ciphertext: latestFileKey.encryptedKey,
            nonce: latestFileKey.nonce,
            publicKey: latestFileKey.sender.publicKey,
            privateKey: PRIVATE_KEY
          })
        : crypto.randomBytes(16).toString("hex");

      const reqBody = {
        orgId,
        skipMultilineEncoding,
        ...encryptSecrets(randomBytes, secrets)
      };

      const { data } = await apiRequest.patch(
        `/api/v1/consumer-secrets/${consumerSecretId}`, // TODO: secret name once blind index implemented
        reqBody
      );
      return data;
    },
    onSuccess: (_, { orgId }) => {
      queryClient.invalidateQueries(consumerSecretKeys.getConsumerSecrets({ orgId }));
    },
    ...options
  });
};
