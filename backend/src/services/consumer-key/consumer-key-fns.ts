import crypto from "crypto";

import { decryptAsymmetric, encryptAsymmetric } from "@app/lib/crypto";
import { TAddConsumerKeysForMembersDTO, TCreateConsumerKeyDTO } from "@app/services/consumer-key/consumer-key-types";

export const createConsumerKey = ({ publicKey, privateKey, plainConsumerKey }: TCreateConsumerKeyDTO) => {
  // Create a random key that we'll use as the consumer key
  const randomBytes = plainConsumerKey || crypto.randomBytes(16).toString("hex");

  // Encrypt the consumer key with the users key pair
  const { ciphertext: encryptedConsumerKey, nonce: encryptedConsumerKeyIv } = encryptAsymmetric(
    randomBytes,
    publicKey,
    privateKey
  );

  return { key: encryptedConsumerKey, iv: encryptedConsumerKeyIv };
};

export const assignConsumerKeysToOrgMembers = ({
  members,
  decryptKey,
  userPrivateKey
}: TAddConsumerKeysForMembersDTO) => {
  const plainConsumerKey = decryptAsymmetric({
    ciphertext: decryptKey.encryptedKey,
    nonce: decryptKey.nonce,
    publicKey: decryptKey.sender.publicKey,
    privateKey: userPrivateKey
  });

  const updatedMembers = members.map(({ userId, orgId, userPublicKey }) => {
    const { ciphertext: inviteeCipherText, nonce: inviteeNonce } = encryptAsymmetric(
      plainConsumerKey,
      userPublicKey,
      userPrivateKey
    );

    return {
      userId,
      orgId,
      consumerEncryptedKey: inviteeCipherText,
      consumerEncryptedNonce: inviteeNonce
    };
  });

  return updatedMembers;
};
