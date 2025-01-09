import { useMutation, useQueryClient } from "@tanstack/react-query";

import { apiRequest } from "@app/config/request";
import { secretSyncKeys } from "@app/hooks/api/secretSyncs/queries";
import {
  TCreateSecretSyncDTO,
  TDeleteSecretSyncDTO,
  TSecretSyncResponse,
  TTriggerSecretSyncDTO,
  TUpdateSecretSyncDTO
} from "@app/hooks/api/secretSyncs/types";

export const useCreateSecretSync = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ destination, ...params }: TCreateSecretSyncDTO) => {
      const { data } = await apiRequest.post<TSecretSyncResponse>(
        `/api/v1/secret-syncs/${destination}`,
        params
      );

      return data.secretSync;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: secretSyncKeys.list() })
  });
};

export const useUpdateSecretSync = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ syncId, destination, ...params }: TUpdateSecretSyncDTO) => {
      const { data } = await apiRequest.patch<TSecretSyncResponse>(
        `/api/v1/secret-syncs/${destination}/${syncId}`,
        params
      );

      return data.secretSync;
    },
    onSuccess: (_, { syncId, destination }) => {
      queryClient.invalidateQueries({ queryKey: secretSyncKeys.list() });
      queryClient.invalidateQueries({ queryKey: secretSyncKeys.byId(destination, syncId) });
    }
  });
};

export const useDeleteSecretSync = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ syncId, destination }: TDeleteSecretSyncDTO) => {
      const { data } = await apiRequest.delete(`/api/v1/secret-syncs/${destination}/${syncId}`);

      return data;
    },
    onSuccess: (_, { syncId, destination }) => {
      queryClient.invalidateQueries({ queryKey: secretSyncKeys.list() });
      queryClient.invalidateQueries({ queryKey: secretSyncKeys.byId(destination, syncId) });
    }
  });
};

export const useTriggerSecretSync = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ syncId, destination }: TTriggerSecretSyncDTO) => {
      const { data } = await apiRequest.post(`/api/v1/secret-syncs/${destination}/${syncId}/sync`);

      return data;
    },
    onSuccess: (_, { syncId, destination }) => {
      queryClient.invalidateQueries({ queryKey: secretSyncKeys.list() });
      queryClient.invalidateQueries({ queryKey: secretSyncKeys.byId(destination, syncId) });
    }
  });
};
