import { AppConnection } from "@app/hooks/api/appConnections/enums";
import { SecretRotationStatus } from "@app/hooks/api/secretRotationsV2";

export type TSecretRotationV2Base = {
  id: string;
  name: string;
  description?: string | null;
  folderId: string;
  connectionId: string;
  createdAt: string;
  updatedAt: string;
  isAutoRotationEnabled: boolean;
  rotationInterval: number;
  nextRotationAt: Date;
  projectId: string;
  rotationStatus: SecretRotationStatus | null;
  rotationJobId: string | null;
  lastRotatedAt: Date;
  rotationMessage?: string | null;
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

export type TSecretRotationV2GeneratedCredentialsResponseBase<U, T> = {
  activeIndex: 0 | 1;
  generatedCredentials: [T, T | undefined];
  type: U;
  rotationId: string;
};
