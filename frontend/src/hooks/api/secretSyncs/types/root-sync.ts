import { AppConnection } from "@app/hooks/api/appConnections/enums";

export type TRootSecretSync = {
  id: string;
  name: string;
  description?: string | null;
  version: number;
  folderId: string;
  connectionId: string;
  createdAt: string;
  updatedAt: string;
  isSynced: boolean | null;
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
