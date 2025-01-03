import { AppConnection } from "@app/hooks/api/appConnections/enums";

export type TRootSecretSync = {
  id: string;
  name: string;
  description?: string | null;
  version: number;
  envId: string;
  secretPath: string;
  createdAt: string;
  updatedAt: string;
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
};
