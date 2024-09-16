import { useMutation, useQueryClient } from "@tanstack/react-query";

import { apiRequest } from "@app/config/request";
import { useWorkspace } from "@app/context";
import { dashboardKeys } from "@app/hooks/api/dashboard/queries";

import { dynamicSecretKeys } from "./queries";
import {
  TCreateDynamicSecretDTO,
  TDeleteDynamicSecretDTO,
  TDynamicSecret,
  TUpdateDynamicSecretDTO
} from "./types";

export const useCreateDynamicSecret = () => {
  const queryClient = useQueryClient();
  const { currentWorkspace } = useWorkspace();

  return useMutation<{}, {}, TCreateDynamicSecretDTO>({
    mutationFn: async (dto) => {
      const { data } = await apiRequest.post<{ dynamicSecret: TDynamicSecret }>(
        "/api/v1/dynamic-secrets",
        dto
      );
      return data.dynamicSecret;
    },
    onSuccess: (_, { path, environmentSlug, projectSlug }) => {
      queryClient.invalidateQueries(
        dashboardKeys.getProjectSecretsDetails({
          projectId: currentWorkspace?.id ?? "",
          secretPath: path,
          environment: environmentSlug
        })
      );
      queryClient.invalidateQueries(dynamicSecretKeys.list({ path, projectSlug, environmentSlug }));
    }
  });
};

export const useUpdateDynamicSecret = () => {
  const queryClient = useQueryClient();
  const { currentWorkspace } = useWorkspace();

  return useMutation<{}, {}, TUpdateDynamicSecretDTO>({
    mutationFn: async (dto) => {
      const { data } = await apiRequest.patch<{ dynamicSecret: TDynamicSecret }>(
        `/api/v1/dynamic-secrets/${dto.name}`,
        dto
      );
      return data.dynamicSecret;
    },
    onSuccess: (_, { path, environmentSlug, projectSlug }) => {
      queryClient.invalidateQueries(
        dashboardKeys.getProjectSecretsDetails({
          projectId: currentWorkspace?.id ?? "",
          secretPath: path,
          environment: environmentSlug
        })
      );
      queryClient.invalidateQueries(dynamicSecretKeys.list({ path, projectSlug, environmentSlug }));
    }
  });
};

export const useDeleteDynamicSecret = () => {
  const queryClient = useQueryClient();
  const { currentWorkspace } = useWorkspace();

  return useMutation<{}, {}, TDeleteDynamicSecretDTO>({
    mutationFn: async (dto) => {
      const { data } = await apiRequest.delete<{ dynamicSecret: TDynamicSecret }>(
        `/api/v1/dynamic-secrets/${dto.name}`,
        { data: dto }
      );
      return data.dynamicSecret;
    },
    onSuccess: (_, { path, environmentSlug, projectSlug }) => {
      queryClient.invalidateQueries(
        dashboardKeys.getProjectSecretsDetails({
          projectId: currentWorkspace?.id ?? "",
          secretPath: path,
          environment: environmentSlug
        })
      );
      queryClient.invalidateQueries(dynamicSecretKeys.list({ path, projectSlug, environmentSlug }));
    }
  });
};
