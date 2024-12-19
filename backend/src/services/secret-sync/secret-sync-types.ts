import { AppConnection } from "@app/lib/app-connections";
import { TSecretSync } from "@app/lib/secret-syncs";

export type TCreateSecretSyncDTO = Pick<
  TSecretSync,
  "syncConfig" | "destinationConfig" | "secretPath" | "envId" | "name" | "projectId" | "connectionId"
> & { app: AppConnection };

export type TUpdateSecretSyncDTO = Partial<Omit<TCreateSecretSyncDTO, "connectionId">> & { syncId: string };

export type TDeleteSecretSyncDTO = { syncId: string };
