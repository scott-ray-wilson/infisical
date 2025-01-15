import { useQuery, UseQueryOptions } from "@tanstack/react-query";

import { apiRequest } from "@app/config/request";
import { appConnectionKeys } from "@app/hooks/api/appConnections";

import {
  TGitHubConnectionListOrganizationsResponse,
  TGitHubConnectionListRepositoriesResponse,
  TGitHubConnectionOrganization,
  TGitHubConnectionRepository
} from "./types";

const githubConnectionKeys = {
  all: [...appConnectionKeys.all, "github"] as const,
  listRepositories: (connectionId: string) =>
    [...githubConnectionKeys.all, "repositories", connectionId] as const,
  listOrganizations: (connectionId: string) =>
    [...githubConnectionKeys.all, "organizatons", connectionId] as const
};

export const useGitHubConnectionListRepositories = (
  connectionId: string,
  options?: Omit<
    UseQueryOptions<
      TGitHubConnectionRepository[],
      unknown,
      TGitHubConnectionRepository[],
      ReturnType<typeof githubConnectionKeys.listRepositories>
    >,
    "queryKey" | "queryFn"
  >
) => {
  return useQuery({
    queryKey: githubConnectionKeys.listRepositories(connectionId),
    queryFn: async () => {
      const { data } = await apiRequest.get<TGitHubConnectionListRepositoriesResponse>(
        `/api/v1/app-connections/github/${connectionId}/repositories`
      );

      return data.repositories;
    },
    ...options
  });
};

export const useGitHubConnectionListOrganizations = (
  connectionId: string,
  options?: Omit<
    UseQueryOptions<
      TGitHubConnectionOrganization[],
      unknown,
      TGitHubConnectionOrganization[],
      ReturnType<typeof githubConnectionKeys.listOrganizations>
    >,
    "queryKey" | "queryFn"
  >
) => {
  return useQuery({
    queryKey: githubConnectionKeys.listOrganizations(connectionId),
    queryFn: async () => {
      const { data } = await apiRequest.get<TGitHubConnectionListOrganizationsResponse>(
        `/api/v1/app-connections/github/${connectionId}/organizations`
      );

      return data.organizations;
    },
    ...options
  });
};
