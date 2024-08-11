export type UserConsumerKeyPair = {
    id: string;
    encryptedKey: string;
    nonce: string;
    sender: Sender;
    receiver: string;
    orgId: string;
    createdAt: string;
    updatedAt: string;
    __v: number;
};

export type Sender = {
    id: string;
    email: string;
    createdAt: string;
    updatedAt: string;
    __v: number;
    firstName: string;
    lastName: string;
    publicKey: string;
};

