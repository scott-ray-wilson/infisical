import { AppConnection } from "@app/hooks/api/appConnections/enums";
import { SecretSyncInitialSyncBehavior, SecretSyncStatus } from "@app/hooks/api/secretSyncs";

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
  projectId: string;
  lastSyncJobId: string | null;
  lastSyncedAt: Date | null;
  lastSyncMessage: string | null;
  syncOptions: {
    initialSyncBehavior: SecretSyncInitialSyncBehavior;
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
