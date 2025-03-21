import { AppConnection } from "@app/hooks/api/appConnections/enums";
import { SecretRotationStatus } from "@app/hooks/api/secretRotationsV2";

export type TSecretRotationBase = {
  id: string;
  name: string;
  description?: string | null;
  folderId: string;
  connectionId: string;
  createdAt: string;
  updatedAt: string;
  isAutoRotationEnabled: boolean;
  interval: number;
  projectId: string;
  rotationStatus: SecretRotationStatus | null;
  lastRotationJobId: string | null;
  lastRotatedAt: Date | null;
  rotationStatusMessage: string | null;
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
