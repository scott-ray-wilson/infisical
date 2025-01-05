import { useQuery, UseQueryOptions } from "@tanstack/react-query";

import { apiRequest } from "@app/config/request";
import { SecretSync } from "@app/hooks/api/secretSyncs/enums";
import {
  TListSecretSyncOptions,
  TListSecretSyncs,
  TSecretSync,
  TSecretSyncResponse
} from "@app/hooks/api/secretSyncs/types";
import { TSecretSyncOption } from "@app/hooks/api/secretSyncs/types/sync-options";

export const secretSyncKeys = {
  all: ["secret-sync"] as const,
  options: () => [...secretSyncKeys.all, "options"] as const,
  list: () => [...secretSyncKeys.all, "list"] as const,
  byId: (destination: SecretSync, syncId: string) =>
    [...secretSyncKeys.all, destination, "by-id", syncId] as const
};

export const useSecretSyncOptions = (
  options?: Omit<
    UseQueryOptions<
      TSecretSyncOption[],
      unknown,
      TSecretSyncOption[],
      ReturnType<typeof secretSyncKeys.options>
    >,
    "queryKey" | "queryFn"
  >
) => {
  return useQuery({
    queryKey: secretSyncKeys.options(),
    queryFn: async () => {
      const { data } = await apiRequest.get<TListSecretSyncOptions>("/api/v1/secret-syncs/options");

      return data.secretSyncOptions;
    },
    ...options
  });
};
//
// export const useGetAppConnectionOption = <T extends AppConnection>(app: T) => {
//   const { data: options = [], isLoading } = useSecretSyncOptions();
//
//   return useMemo(
//     () => ({
//       option: (options.find((opt) => opt.app === app) as TAppConnectionOptionMap[T]) ?? {},
//       isLoading
//     }),
//     [options, app]
//   );
// };

export const useListSecretSyncs = (
  projectId: string,
  options?: Omit<
    UseQueryOptions<TSecretSync[], unknown, TSecretSync[], ReturnType<typeof secretSyncKeys.list>>,
    "queryKey" | "queryFn"
  >
) => {
  return useQuery({
    queryKey: secretSyncKeys.list(),
    queryFn: async () => {
      const { data } = await apiRequest.get<TListSecretSyncs>("/api/v1/secret-syncs", {
        params: { projectId }
      });

      return data.secretSyncs;
    },
    ...options
  });
};

export const useGetSecretSync = (
  destination: SecretSync,
  syncId: string,
  options?: Omit<
    UseQueryOptions<TSecretSync, unknown, TSecretSync, ReturnType<typeof secretSyncKeys.byId>>,
    "queryKey" | "queryFn"
  >
) => {
  return useQuery({
    queryKey: secretSyncKeys.byId(destination, syncId),
    queryFn: async () => {
      const { data } = await apiRequest.get<TSecretSyncResponse>(
        `/api/v1/secret-syncs/${destination}/${syncId}`
      );

      return data.secretSync;
    },
    ...options
  });
};
