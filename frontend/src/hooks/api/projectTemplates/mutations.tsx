import { useMutation, useQueryClient } from "@tanstack/react-query";
import { encodeBase64 } from "tweetnacl-util";

import { apiRequest } from "@app/config/request";
import { cmekKeys } from "@app/hooks/api/cmeks/queries";
import {
  TCmekDecrypt,
  TCmekDecryptResponse,
  TCmekEncrypt,
  TCmekEncryptResponse,
  TUpdateCmek
} from "@app/hooks/api/cmeks/types";
import { projectTemplateKeys } from "@app/hooks/api/projectTemplates/queries";
import {
  TCreateProjectTemplateDTO,
  TDeleteProjectTemplateDTO
} from "@app/hooks/api/projectTemplates/types";

export const useCreateProjectTemplate = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: TCreateProjectTemplateDTO) => {
      const { data } = await apiRequest.post("/api/v1/project-templates", payload);

      return data;
    },
    onSuccess: () => queryClient.invalidateQueries(projectTemplateKeys.list())
  });
};

export const useUpdateCmek = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ keyId, name, description, isDisabled }: TUpdateCmek) => {
      const { data } = await apiRequest.patch(`/api/v1/kms/keys/${keyId}`, {
        name,
        description,
        isDisabled
      });

      return data;
    },
    onSuccess: (_, { projectId }) => {
      queryClient.invalidateQueries(cmekKeys.getCmeksByProjectId({ projectId }));
    }
  });
};

export const useDeleteProjectTemplate = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ templateId }: TDeleteProjectTemplateDTO) => {
      const { data } = await apiRequest.delete(`/api/v1/project-templates/${templateId}`);

      return data;
    },
    onSuccess: () => queryClient.invalidateQueries(projectTemplateKeys.list())
  });
};

export const useCmekEncrypt = () => {
  return useMutation({
    mutationFn: async ({ keyId, plaintext, isBase64Encoded }: TCmekEncrypt) => {
      const { data } = await apiRequest.post<TCmekEncryptResponse>(
        `/api/v1/kms/keys/${keyId}/encrypt`,
        {
          plaintext: isBase64Encoded ? plaintext : encodeBase64(Buffer.from(plaintext))
        }
      );

      return data;
    }
  });
};

export const useCmekDecrypt = () => {
  return useMutation({
    mutationFn: async ({ keyId, ciphertext }: TCmekDecrypt) => {
      const { data } = await apiRequest.post<TCmekDecryptResponse>(
        `/api/v1/kms/keys/${keyId}/decrypt`,
        {
          ciphertext
        }
      );

      return data;
    }
  });
};
