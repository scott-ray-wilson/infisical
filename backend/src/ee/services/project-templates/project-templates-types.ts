import { TProjectEnvironments } from "@app/db/schemas";
import { TProjectPermissionV2Schema } from "@app/ee/services/permission/project-permission";

export type ProjectTemplateEnvironment = Pick<TProjectEnvironments, "name" | "slug" | "position">;

export type TCreateProjectTemplateDTO = {
  name: string;
  description?: string;
  roles: {
    name: string;
    slug: string;
    description?: string;
    permissions: TProjectPermissionV2Schema[];
  }[];
  environments: ProjectTemplateEnvironment[];
};

export type TUpdateProjectTemplateDTO = Partial<TCreateProjectTemplateDTO>;
