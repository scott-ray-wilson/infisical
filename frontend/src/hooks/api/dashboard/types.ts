import { OrderByDirection } from "@app/hooks/api/generic/types";
import { SecretV3Raw, SecretV3RawSanitized } from "@app/hooks/api/secrets/types";

export type DashboardProjectSecretOverviewResponse = {
  secrets: SecretV3Raw[];
};

export type DashboardProjectSecretsDetailsResponse = {
  secrets: SecretV3Raw[];
  totalCount: number;
};

// export type DashboardProjectSecretsOverview = {
//   secrets: Record<string, SecretV3RawSanitized>;
// };

export type DashboardProjectSecretsDetails = {
  secrets: SecretV3RawSanitized[];
  totalCount: number;
};

export enum DashboardSecretsOrderBy {
  Name = "name"
}

export type TGetDashboardProjectSecretsOverviewDTO = {
  workspaceId: string;
  secretPath: string;
  offset?: number;
  limit?: number;
  orderBy?: DashboardSecretsOrderBy;
  orderDirection?: OrderByDirection;
  search?: string;
};

export type TGetDashboardProjectSecretsDetailsDTO = TGetDashboardProjectSecretsOverviewDTO & {
  environment: string;
};
