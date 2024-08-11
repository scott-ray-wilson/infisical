import { ConsumerSecretType } from "@app/db/schemas";
import { TOrgPermission } from "@app/lib/types";

export type TCreateConsumerSecretDTO = {
  secretName: string;
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

  skipMultilineEncoding?: boolean;
  metadata?: {
    source?: string;
  };
} & TOrgPermission;

export type TGetConsumerSecretsDTO = TOrgPermission;
export type TDeleteConsumerSecretsDTO = { consumerSecretId: string } & TOrgPermission;
export type TUpdateConsumerSecretsDTO = {
  consumerSecretId: string; // TODO: remove once blind index is implemented
  // secretName: string;

  // type: ConsumerSecretType; Not allowing updating of type
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
} & TOrgPermission;
