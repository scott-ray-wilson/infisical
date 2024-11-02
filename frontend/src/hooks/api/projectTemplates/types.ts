import { TProjectRole } from "@app/hooks/api/roles/types";

export type TProjectTemplate = {
  id: string;
  name: string;
  description?: string;
  roles: Pick<TProjectRole, "name" | "slug" | "description" | "permissions">[];
  environments: { name: string; slug: string; position: number }[];
  createdAt: string;
  updatedAt: string;
};

export type TCreateProjectTemplateDTO = {
  name: string;
  description?: string;
};

export type TListProjectTemplates = { projectTemplates: TProjectTemplate[] };
