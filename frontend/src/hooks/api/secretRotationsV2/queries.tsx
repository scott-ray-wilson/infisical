import { useQuery, UseQueryOptions } from "@tanstack/react-query";

import { apiRequest } from "@app/config/request";
import { SecretRotation } from "@app/hooks/api/secretRotationsV2/enums";
import {
  TListSecretRotationV2Options,
  TSecretRotationV2Option
} from "@app/hooks/api/secretRotationsV2/types";

export const secretRotationV2Keys = {
  all: ["secret-rotations-v2"] as const,
  options: () => [...secretRotationV2Keys.all, "options"] as const,
  list: (projectId: string) => [...secretRotationV2Keys.all, "list", projectId] as const,
  byId: (type: SecretRotation, rotationId: string) =>
    [...secretRotationV2Keys.all, type, "by-id", rotationId] as const
};

export const useSecretRotationV2Options = (
  options?: Omit<
    UseQueryOptions<
      TSecretRotationV2Option[],
      unknown,
      TSecretRotationV2Option[],
      ReturnType<typeof secretRotationV2Keys.options>
    >,
    "queryKey" | "queryFn"
  >
) => {
  return useQuery({
    queryKey: secretRotationV2Keys.options(),
    queryFn: async () => {
      const { data } = await apiRequest.get<TListSecretRotationV2Options>(
        "/api/v2/secret-rotations/options"
      );

      return data.secretRotationOptions;
    },
    ...options
  });
};

export const useSecretRotationV2Option = (type: SecretRotation) => {
  const { data: rotationOptions, isPending } = useSecretRotationV2Options();
  const rotationOption = rotationOptions?.find((option) => option.type === type);

  return { rotationOption, isPending };
};
