import { AppConnection } from "@app/hooks/api/appConnections/enums";

import { SecretSyncStatus } from "./secret-sync-enums.ts";

export type TRootSecretSync = {
  id: string;
  name: string;
  description?: string | null;
  version: number;
  folderId: string;
  connectionId: string;
  createdAt: string;
  updatedAt: string;
  syncStatus: SecretSyncStatus | null;
  isEnabled: boolean;
  lastSyncJobId: string | null;
  lastSyncedAt: Date | null;
  lastSyncMessage: string | null;
  syncOptions: {
    prependPrefix?: string;
    appendSuffix?: string;
  };
  connection: {
    app: AppConnection;
    id: string;
    name: string;
  };
  environment: {
    id: string;
    name: string;
    slug: string;
  };
  folder: {
    id: string;
    path: string;
  };
};
