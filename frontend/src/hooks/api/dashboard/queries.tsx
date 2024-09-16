import { useCallback } from "react";
import { useQuery, UseQueryOptions } from "@tanstack/react-query";
import axios from "axios";

import { createNotification } from "@app/components/notifications";
import { apiRequest } from "@app/config/request";
import {
  DashboardProjectSecretsDetails,
  DashboardProjectSecretsDetailsResponse,
  DashboardSecretsOrderBy,
  TGetDashboardProjectSecretsDetailsDTO
} from "@app/hooks/api/dashboard/types";
import { OrderByDirection } from "@app/hooks/api/generic/types";
import { mergePersonalSecrets } from "@app/hooks/api/secrets/queries";

export const dashboardKeys = {
  all: () => ["dashboard"] as const,
  // getProjectSecretsOverview: ({
  //   projectId,
  //   secretPath,
  //   ...params
  // }: TGetDashboardProjectSecretsOverviewDTO) =>
  //   [{ projectId, secretPath }, "secrets-overview", params] as const,
  getProjectSecretsDetails: ({
    projectId,
    secretPath,
    environment,
    ...params
  }: TGetDashboardProjectSecretsDetailsDTO) =>
    [
      ...dashboardKeys.all(),
      { projectId, secretPath, environment },
      "secrets-details",
      params
    ] as const
};

// export const fetchProjectSecretsOverview = async ({
//   projectId,
//   secretPath
// }: TGetDashboardProjectSecretsOverviewDTO) => {
//   const { data } = await apiRequest.get<DashboardProjectSecretOverviewResponse>(
//     "/api/v3/dashboard/secrets-overview",
//     {
//       params: {
//         projectId,
//         secretPath
//       }
//     }
//   );
//
//   return data;
// };

export const fetchProjectSecretsDetails = async ({
  includeFolders,
  includeImports,
  includeSecrets,
  includeDynamicSecrets,
  ...params
}: TGetDashboardProjectSecretsDetailsDTO) => {
  const { data } = await apiRequest.get<DashboardProjectSecretsDetailsResponse>(
    "/api/v3/dashboard/secrets-details",
    {
      params: {
        ...params,
        includeImports: includeImports ? "1" : "",
        includeFolders: includeFolders ? "1" : "",
        includeSecrets: includeSecrets ? "1" : "",
        includeDynamicSecrets: includeDynamicSecrets ? "1" : ""
      }
    }
  );

  return data;
};

// export const useGetProjectSecretsOverview = (
//   {
//     projectId,
//     secretPath,
//     offset = 0,
//     limit = 100,
//     orderBy = DashboardSecretsOrderBy.Name,
//     orderDirection = OrderByDirection.ASC,
//     search = ""
//   }: TGetDashboardProjectSecretsOverviewDTO,
//   options?: Omit<
//     UseQueryOptions<
//       DashboardProjectSecretOverviewResponse,
//       unknown,
//       DashboardProjectSecretsOverview,
//       ReturnType<typeof dashboardKeys.getProjectSecretsOverview>
//     >,
//     "queryKey" | "queryFn"
//   >
// ) =>
//   useQuery({
//     ...options,
//     // wait for all values to be available
//     enabled: Boolean(projectId) && (options?.enabled ?? true),
//     queryKey: dashboardKeys.getProjectSecretsOverview({ projectId, secretPath }),
//     queryFn: () => fetchProjectSecretsOverview({ projectId, secretPath }),
//     onError: (error) => {
//       if (axios.isAxiosError(error)) {
//         const serverResponse = error.response?.data as { message: string };
//         createNotification({
//           title: "Error fetching secret overview",
//           type: "error",
//           text: serverResponse.message
//         });
//       }
//     },
//     select: useCallback(
//       (data: Awaited<ReturnType<typeof fetchProjectSecretsOverview>>) => ({
//         secrets: mergePersonalSecrets(data.secrets).reduce<Record<string, SecretV3RawSanitized>>(
//           (prev, curr) => ({ ...prev, [curr.key]: curr }),
//           {}
//         )
//       }),
//       []
//     )
//   });

export const useGetProjectSecretsDetails = (
  {
    projectId,
    secretPath,
    environment,
    offset = 0,
    limit = 100,
    orderBy = DashboardSecretsOrderBy.Name,
    orderDirection = OrderByDirection.ASC,
    search = "",
    includeSecrets,
    includeFolders,
    includeImports,
    includeDynamicSecrets
  }: TGetDashboardProjectSecretsDetailsDTO,
  options?: Omit<
    UseQueryOptions<
      DashboardProjectSecretsDetailsResponse,
      unknown,
      DashboardProjectSecretsDetails,
      ReturnType<typeof dashboardKeys.getProjectSecretsDetails>
    >,
    "queryKey" | "queryFn"
  >
) => {
  return useQuery({
    ...options,
    // wait for all values to be available
    enabled: Boolean(projectId) && (options?.enabled ?? true),
    queryKey: dashboardKeys.getProjectSecretsDetails({
      secretPath,
      search,
      limit,
      orderBy,
      orderDirection,
      offset,
      projectId,
      environment,
      includeSecrets,
      includeFolders,
      includeImports,
      includeDynamicSecrets
    }),
    queryFn: () =>
      fetchProjectSecretsDetails({
        secretPath,
        search,
        limit,
        orderBy,
        orderDirection,
        offset,
        projectId,
        environment,
        includeSecrets,
        includeFolders,
        includeImports,
        includeDynamicSecrets
      }),
    onError: (error) => {
      if (axios.isAxiosError(error)) {
        const serverResponse = error.response?.data as { message: string };
        createNotification({
          title: "Error fetching secret details",
          type: "error",
          text: serverResponse.message
        });
      }
    },
    select: useCallback(
      (data: Awaited<ReturnType<typeof fetchProjectSecretsDetails>>) => ({
        ...data,
        secrets: mergePersonalSecrets(data.secrets)
      }),
      []
    ),
    keepPreviousData: true
  });
};
