import { TConsumerKeys } from "@app/db/schemas";
import { TOrgPermission } from "@app/lib/types";

export type TGetLatestConsumerKeyDTO = TOrgPermission;

export type TCreateConsumerKeyDTO = {
  publicKey: string;
  privateKey: string;
  plainConsumerKey?: string;
};

export type TAddConsumerKeysForMembersDTO = {
  decryptKey: TConsumerKeys & { sender: { publicKey: string } };
  userPrivateKey: string;
  members: {
    userId: string;
    orgId: string;
    userPublicKey: string;
  }[];
};
