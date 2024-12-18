import { AppConnection } from "@app/lib/app-connections";
import { SecretSync } from "@app/lib/secret-syncs/secret-sync-enums";

import { TAwsParameterStoreSecretSync } from "./aws-parameter-store";

export type TSecretSync = TAwsParameterStoreSecretSync;

export type TSecretSyncListItem = {
  name: string;
  slug: SecretSync;
  app: AppConnection;
};

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
