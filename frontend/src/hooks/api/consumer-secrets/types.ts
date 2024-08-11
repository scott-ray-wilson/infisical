import { UserConsumerKeyPair } from "@app/hooks/api/consumer-keys/types";

export enum ConsumerSecretType {
  Login = "login",
  CreditCard = "credit-card",
  Note = "note"
}

export type TCreateConsumerSecretDTO = {
  latestFileKey: UserConsumerKeyPair;
  secretName: string;
  secretFieldOne: string;
  secretFieldTwo: string;
  secretFieldThree: string;
  skipMultilineEncoding?: boolean;
  type: ConsumerSecretType;
  orgId: string;
};

export type TUpdateConsumerSecretDTO = {
  consumerSecretId: string; // TODO: replace with secret name once blind index is implemented
} & TCreateConsumerSecretDTO;

export type TDeleteConsumerSecretDTO = {
  consumerSecretId: string;
  orgId: string;
};

export type TGetConsumerSecretsKey = {
  orgId: string;
};

export type TGetConsumerSecretsDTO = {
  decryptConsumerKey: UserConsumerKeyPair;
} & TGetConsumerSecretsKey;

export type EncryptedConsumerSecret = {
  id: string;
  type: ConsumerSecretType;
  secretNameCiphertext: string;
  secretNameIV: string;
  secretNameTag: string;

  secretFieldOneCiphertext: string;
  secretFieldOneIV: string;
  secretFieldOneTag: string;

  secretFieldTwoCiphertext: string;
  secretFieldTwoIV: string;
  secretFieldTwoTag: string;

  secretFieldThreeCiphertext: string;
  secretFieldThreeIV: string;
  secretFieldThreeTag: string;

  secretFieldFourCiphertext: string;
  secretFieldFourIV: string;
  secretFieldFourTag: string;

  createdAt: string;
  updatedAt: string;
  skipMultilineEncoding?: boolean;
};

export type DecryptedConsumerSecret = {
  id: string;
  type: ConsumerSecretType;

  secretName: string;
  secretFieldOne: string;
  secretFieldTwo: string;
  secretFieldThree: string;
  secretFieldFour: string;
  createdAt: string;
  updatedAt: string;
  skipMultilineEncoding?: boolean;
};
