import { TDynamicSecret } from "@app/hooks/api/dynamicSecret/types";
import { OrderByDirection } from "@app/hooks/api/generic/types";
import { TSecretFolder } from "@app/hooks/api/secretFolders/types";
import { TSecretImport } from "@app/hooks/api/secretImports/types";
import { SecretV3Raw, SecretV3RawSanitized } from "@app/hooks/api/secrets/types";

export type DashboardProjectSecretOverviewResponse = {
  secrets: SecretV3Raw[];
};

export type DashboardProjectSecretsDetailsResponse = {
  imports: TSecretImport[];
  folders: TSecretFolder[];
  dynamicSecrets: TDynamicSecret[];
  secrets: SecretV3Raw[];
  totalSecretCount: number;
  totalFolderCount: number;
  totalImportCount: number;
  totalDynamicSecretCount: number;
  totalCount: number;
};

// export type DashboardProjectSecretsOverview = {
//   secrets: Record<string, SecretV3RawSanitized>;
// };

export type DashboardProjectSecretsDetails = Omit<
  DashboardProjectSecretsDetailsResponse,
  "secrets"
> & {
  secrets: SecretV3RawSanitized[];
};

export enum DashboardSecretsOrderBy {
  Name = "name"
}

export type TGetDashboardProjectSecretsOverviewDTO = {
  projectId: string;
  secretPath: string;
  offset?: number;
  limit?: number;
  orderBy?: DashboardSecretsOrderBy;
  orderDirection?: OrderByDirection;
  search?: string;
  includeSecrets?: boolean;
  includeFolders?: boolean;
  includeImports?: boolean;
  includeDynamicSecrets?: boolean;
};

export type TGetDashboardProjectSecretsDetailsDTO = TGetDashboardProjectSecretsOverviewDTO & {
  environment: string;
};
