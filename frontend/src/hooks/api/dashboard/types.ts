import { TDynamicSecret } from "@app/hooks/api/dynamicSecret/types";
import { OrderByDirection } from "@app/hooks/api/generic/types";
import { TSecretFolder } from "@app/hooks/api/secretFolders/types";
import { TSecretImport } from "@app/hooks/api/secretImports/types";
import { SecretV3Raw, SecretV3RawSanitized } from "@app/hooks/api/secrets/types";

export type DashboardProjectSecretsOverviewResponse = {
  folders?: { [key: string]: TSecretFolder[] };
  dynamicSecrets?: TDynamicSecret[];
  secrets?: SecretV3Raw[];
  totalSecretCount?: number;
  totalFolderCount?: number;
  totalDynamicSecretCount?: number;
  totalCount: number;
};

export type DashboardProjectSecretsDetailsResponse = DashboardProjectSecretsOverviewResponse & {
  imports?: TSecretImport[];
  totalImportCount?: number;
};

// export type DashboardProjectSecretsOverview = {
//   secrets: Record<string, SecretV3RawSanitized>;
// };

export type DashboardProjectSecretsOverview = Omit<
  DashboardProjectSecretsOverviewResponse,
  "secrets"
> & {
  secrets?: Record<string, SecretV3RawSanitized>;
};

export type DashboardProjectSecretsDetails = Omit<
  DashboardProjectSecretsDetailsResponse,
  "secrets"
> & {
  secrets?: SecretV3RawSanitized[];
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
  includeDynamicSecrets?: boolean;
  environments: string[];
};

export type TGetDashboardProjectSecretsDetailsDTO = Omit<
  TGetDashboardProjectSecretsOverviewDTO,
  "environments"
> & {
  environment: string;
  includeImports?: boolean;
};
