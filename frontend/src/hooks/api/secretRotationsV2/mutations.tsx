import { useMutation, useQueryClient } from "@tanstack/react-query";

import { apiRequest } from "@app/config/request";
import { secretRotationV2Keys } from "@app/hooks/api/secretRotationsV2/queries";
import {
  TCreateSecretRotationV2DTO,
  TSecretRotationV2Response
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
    onSuccess: (_, { projectId }) =>
      queryClient.invalidateQueries({ queryKey: secretRotationV2Keys.list(projectId) })
  });
};
