import { useQuery, UseQueryOptions } from "@tanstack/react-query";

import { apiRequest } from "@app/config/request";
import { TListProjectTemplates } from "@app/hooks/api/projectTemplates/types";

export const projectTemplateKeys = {
  all: ["project-template"] as const,
  list: () => [...projectTemplateKeys.all, "list"] as const
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
