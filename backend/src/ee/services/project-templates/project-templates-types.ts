import { TProjectEnvironments, TProjectTemplates } from "@app/db/schemas";
import { TProjectPermissionV2Schema } from "@app/ee/services/permission/project-permission";

export type TProjectTemplateEnvironment = Pick<TProjectEnvironments, "name" | "slug" | "position">;

export type TProjectTemplateRole = {
  slug: string;
  permissions: TProjectPermissionV2Schema[];
};

export type TCreateProjectTemplateDTO = {
  name: string;
  description?: string;
  roles: TProjectTemplateRole[];
  environments: TProjectTemplateEnvironment[];
};

export type TUpdateProjectTemplateDTO = Partial<TCreateProjectTemplateDTO>;
