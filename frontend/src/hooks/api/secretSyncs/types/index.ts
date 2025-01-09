import { SecretSync } from "@app/hooks/api/secretSyncs/enums";
import { TAwsParameterStoreSync } from "@app/hooks/api/secretSyncs/types/aws-parameter-store-sync";
import { TSecretSyncOption } from "@app/hooks/api/secretSyncs/types/sync-options";

export type TSecretSync = TAwsParameterStoreSync;

export type TListSecretSyncs = { secretSyncs: TSecretSync[] };

export type TListSecretSyncOptions = { secretSyncOptions: TSecretSyncOption[] };
export type TSecretSyncResponse = { secretSync: TSecretSync };

export type TCreateSecretSyncDTO = Pick<
  TSecretSync,
  | "name"
  | "destinationConfig"
  | "description"
  | "connectionId"
  | "syncOptions"
  | "folderId"
  | "destination"
>;

export type TUpdateSecretSyncDTO = Partial<
  Omit<TCreateSecretSyncDTO, "connectionId" | "destination">
> & {
  destination: SecretSync;
  syncId: string;
};

export type TDeleteSecretSyncDTO = {
  destination: SecretSync;
  syncId: string;
};

export type TTriggerSecretSyncDTO = {
  destination: SecretSync;
  syncId: string;
};
