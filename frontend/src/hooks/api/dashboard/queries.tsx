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
  // getProjectSecretsOverview: ({
  //   workspaceId,
  //   secretPath,
  //   ...params
  // }: TGetDashboardProjectSecretsOverviewDTO) =>
  //   [{ workspaceId, secretPath }, "secrets-overview", params] as const,
  getProjectSecretsDetails: ({
    workspaceId,
    secretPath,
    environment,
    ...params
  }: TGetDashboardProjectSecretsDetailsDTO) =>
    [{ workspaceId, secretPath, environment }, "secrets-details", params] as const
};

// export const fetchProjectSecretsOverview = async ({
//   workspaceId,
//   secretPath
// }: TGetDashboardProjectSecretsOverviewDTO) => {
//   const { data } = await apiRequest.get<DashboardProjectSecretOverviewResponse>(
//     "/api/v3/dashboard/secrets-overview",
//     {
//       params: {
//         workspaceId,
//         secretPath
//       }
//     }
//   );
//
//   return data;
// };

export const fetchProjectSecretsDetails = async (params: TGetDashboardProjectSecretsDetailsDTO) => {
  const { data } = await apiRequest.get<DashboardProjectSecretsDetailsResponse>(
    "/api/v3/dashboard/secrets-details",
    {
      params
    }
  );

  return data;
};

// export const useGetProjectSecretsOverview = (
//   {
//     workspaceId,
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
//     enabled: Boolean(workspaceId) && (options?.enabled ?? true),
//     queryKey: dashboardKeys.getProjectSecretsOverview({ workspaceId, secretPath }),
//     queryFn: () => fetchProjectSecretsOverview({ workspaceId, secretPath }),
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
    workspaceId,
    secretPath,
    environment,
    offset = 0,
    limit = 100,
    orderBy = DashboardSecretsOrderBy.Name,
    orderDirection = OrderByDirection.ASC,
    search = ""
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
    enabled: Boolean(workspaceId) && (options?.enabled ?? true),
    queryKey: dashboardKeys.getProjectSecretsDetails({
      secretPath,
      search,
      limit,
      orderBy,
      orderDirection,
      offset,
      workspaceId,
      environment
    }),
    queryFn: () =>
      fetchProjectSecretsDetails({
        secretPath,
        search,
        limit,
        orderBy,
        orderDirection,
        offset,
        workspaceId,
        environment
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
