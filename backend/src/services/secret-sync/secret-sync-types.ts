import { SecretSync, TSecretSync } from "@app/lib/secret-syncs";

export type TFindSecretSyncByIdDTO = {
  syncId: string;
  syncDestination: SecretSync;
};

export type TFindSecretSyncByNameDTO = {
  syncName: string;
  projectId: string;
  syncDestination: SecretSync;
};

export type TCreateSecretSyncDTO = Pick<
  TSecretSync,
  "syncConfig" | "destinationConfig" | "secretPath" | "envId" | "name" | "projectId" | "connectionId"
> & { syncDestination: SecretSync };

export type TUpdateSecretSyncDTO = Partial<Omit<TCreateSecretSyncDTO, "connectionId">> & {
  syncId: string;
  syncDestination: SecretSync;
};

export type TDeleteSecretSyncDTO = {
  syncDestination: SecretSync;
  syncId: string;
};
