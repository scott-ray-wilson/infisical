import { SecretSync, SecretSyncImportBehavior } from "@app/hooks/api/secretSyncs";
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
  | "destination"
  | "isEnabled"
> & { environment: string; secretPath: string; projectId: string };

export type TUpdateSecretSyncDTO = Partial<
  Omit<TCreateSecretSyncDTO, "connectionId" | "destination" | "projectId">
> & {
  destination: SecretSync;
  syncId: string;
};

export type TDeleteSecretSyncDTO = {
  destination: SecretSync;
  syncId: string;
};

export type TTriggerSecretSyncSyncSecretsDTO = {
  destination: SecretSync;
  syncId: string;
};

export type TTriggerSecretSyncImportSecretsDTO = {
  destination: SecretSync;
  syncId: string;
  importBehavior: SecretSyncImportBehavior;
};

export type TTriggerSecretSyncRemoveSecretsDTO = {
  destination: SecretSync;
  syncId: string;
};
