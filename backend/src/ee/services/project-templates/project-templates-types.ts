import { TProjectEnvironments, TProjectRoles } from "@app/db/schemas";

export type ProjectTemplateRole = Pick<TProjectRoles, "name" | "description" | "permissions">;
export type ProjectTemplateEnvironment = Pick<TProjectEnvironments, "name" | "position">;

export type TCreateProjectTemplateDTO = {
  name: string;
  description?: string;
  roles: ProjectTemplateRole[];
  environments: ProjectTemplateEnvironment[];
};

export type TUpdateProjectTemplateDTO = TCreateProjectTemplateDTO;
