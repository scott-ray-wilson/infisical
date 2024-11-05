import { useQuery, UseQueryOptions } from "@tanstack/react-query";

import { apiRequest } from "@app/config/request";
import {
  TGetProjectTemplateById,
  TListProjectTemplates,
  TProjectTemplate
} from "@app/hooks/api/projectTemplates/types";

export const projectTemplateKeys = {
  all: ["project-template"] as const,
  list: () => [...projectTemplateKeys.all, "list"] as const,
  byId: (templateId: string) => [...projectTemplateKeys.all, templateId] as const
};

export const useListProjectTemplates = (
  options?: Omit<
    UseQueryOptions<
      TListProjectTemplates["projectTemplates"],
      unknown,
      TListProjectTemplates["projectTemplates"],
      ReturnType<typeof projectTemplateKeys.list>
    >,
    "queryKey" | "queryFn"
  >
) => {
  return useQuery({
    queryKey: projectTemplateKeys.list(),
    queryFn: async () => {
      const { data } = await apiRequest.get<TListProjectTemplates>("/api/v1/project-templates");

      return data.projectTemplates;
    },
    ...options
  });
};

export const useGetProjectTemplateById = (
  templateId: string,
  options?: Omit<
    UseQueryOptions<
      TProjectTemplate,
      unknown,
      TProjectTemplate,
      ReturnType<typeof projectTemplateKeys.byId>
    >,
    "queryKey" | "queryFn"
  >
) => {
  return useQuery({
    queryKey: projectTemplateKeys.byId(templateId),
    queryFn: async () => {
      const { data } = await apiRequest.get<TGetProjectTemplateById>(
        `/api/v1/project-templates/${templateId}`
      );

      return data.projectTemplate;
    },
    enabled: (options?.enabled ?? true) && Boolean(templateId),
    ...options
  });
};
