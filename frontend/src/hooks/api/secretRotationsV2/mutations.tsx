import { useMutation, useQueryClient } from "@tanstack/react-query";

import { apiRequest } from "@app/config/request";
import { dashboardKeys } from "@app/hooks/api/dashboard/queries";
import {
  TCreateSecretRotationV2DTO,
  TRotateSecretRotationV2DTO,
  TSecretRotationV2Response,
  TUpdateSecretRotationV2DTO
} from "@app/hooks/api/secretRotationsV2/types";

export const useCreateSecretRotationV2 = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ type, ...params }: TCreateSecretRotationV2DTO) => {
      const { data } = await apiRequest.post<TSecretRotationV2Response>(
        `/api/v2/secret-rotations/${type}`,
        params
      );

      return data.secretRotation;
    },
    onSuccess: (_, { projectId, secretPath }) =>
      queryClient.invalidateQueries({
        queryKey: dashboardKeys.getDashboardSecrets({ projectId, secretPath })
      })
  });
};

export const useUpdateSecretRotationV2 = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ type, rotationId, ...params }: TUpdateSecretRotationV2DTO) => {
      const { data } = await apiRequest.patch<TSecretRotationV2Response>(
        `/api/v2/secret-rotations/${type}/${rotationId}`,
        params
      );

      return data.secretRotation;
    },
    onSuccess: (_, { projectId, secretPath }) =>
      queryClient.invalidateQueries({
        queryKey: dashboardKeys.getDashboardSecrets({ projectId, secretPath })
      })
  });
};

export const useRotateSecretRotationV2 = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ type, rotationId, ...params }: TRotateSecretRotationV2DTO) => {
      const { data } = await apiRequest.post<TSecretRotationV2Response>(
        `/api/v2/secret-rotations/${type}/${rotationId}/rotate`,
        params
      );

      return data.secretRotation;
    },
    onSuccess: (_, { projectId, secretPath }) =>
      queryClient.invalidateQueries({
        queryKey: dashboardKeys.getDashboardSecrets({ projectId, secretPath })
      })
  });
};
