import { TGitHubSync, TGitHubSyncInput, TGitHubSyncListItem } from "@app/services/secret-sync/github";
import { SecretSync } from "@app/services/secret-sync/secret-sync-enums";

import {
  TAwsParameterStoreSync,
  TAwsParameterStoreSyncInput,
  TAwsParameterStoreSyncListItem
} from "./aws-parameter-store";

export type TSecretSync = TAwsParameterStoreSync | TGitHubSync;

export type TSecretSyncInput = TAwsParameterStoreSyncInput | TGitHubSyncInput;

export type TSecretSyncListItem = TAwsParameterStoreSyncListItem | TGitHubSyncListItem;

export type TListSecretSyncsByProjectId = {
  projectId: string;
  destination?: SecretSync;
};

export type TFindSecretSyncByIdDTO = {
  syncId: string;
  destination: SecretSync;
};

export type TFindSecretSyncByNameDTO = {
  syncName: string;
  projectId: string;
  destination: SecretSync;
};

export type TCreateSecretSyncDTO = Pick<
  TSecretSync,
  "syncOptions" | "destinationConfig" | "secretPath" | "envId" | "name" | "connectionId"
> & { destination: SecretSync };

export type TUpdateSecretSyncDTO = Partial<Omit<TCreateSecretSyncDTO, "connectionId">> & {
  syncId: string;
  destination: SecretSync;
};

export type TDeleteSecretSyncDTO = {
  destination: SecretSync;
  syncId: string;
};
