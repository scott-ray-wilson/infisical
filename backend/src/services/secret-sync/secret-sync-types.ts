import { TGitHubSync, TGitHubSyncListItem } from "@app/services/secret-sync/github";
import { SecretSync } from "@app/services/secret-sync/secret-sync-enums";

import { TAwsParameterStoreSync, TAwsParameterStoreSyncListItem } from "./aws-parameter-store";

export type TSecretSync = TAwsParameterStoreSync | TGitHubSync;

export type TSecretSyncListItem = TAwsParameterStoreSyncListItem | TGitHubSyncListItem;

export type TListSecretSyncsByProjectId = {
  projectId: string;
  // TODO: add filters for sync differentiation
};

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
