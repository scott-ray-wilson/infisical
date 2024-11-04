import { ForbiddenError } from "@casl/ability";
import { packRules } from "@casl/ability/extra";
import { unknown } from "zod";

import { TLicenseServiceFactory } from "@app/ee/services/license/license-service";
import { OrgPermissionActions, OrgPermissionSubjects } from "@app/ee/services/permission/org-permission";
import { TPermissionServiceFactory } from "@app/ee/services/permission/permission-service";
import {
  TCreateProjectTemplateDTO,
  TUpdateProjectTemplateDTO
} from "@app/ee/services/project-templates/project-templates-types";
import { BadRequestError, NotFoundError } from "@app/lib/errors";
import { OrgServiceActor } from "@app/lib/types";

import { TProjectTemplatesDALFactory } from "./project-templates-dal";

type TProjectTemplatesServiceFactoryDep = {
  licenseService: TLicenseServiceFactory;
  permissionService: TPermissionServiceFactory;
  projectTemplatesDAL: TProjectTemplatesDALFactory;
};

export type TProjectTemplatesServiceFactory = ReturnType<typeof projectTemplatesServiceFactory>;

export const projectTemplatesServiceFactory = ({
  licenseService,
  permissionService,
  projectTemplatesDAL
}: TProjectTemplatesServiceFactoryDep) => {
  const listProjectTemplatesByOrg = async (actor: OrgServiceActor) => {
    const { permission } = await permissionService.getOrgPermission(
      actor.type,
      actor.id,
      actor.orgId,
      actor.authMethod,
      actor.orgId
    );

    ForbiddenError.from(permission).throwUnlessCan(OrgPermissionActions.Read, OrgPermissionSubjects.ProjectTemplates);

    const plan = await licenseService.getPlan(actor.orgId);

    if (!plan.projectTemplates)
      throw new BadRequestError({
        message: "Failed to access project templates due to plan restriction. Upgrade plan to access project templates."
      });

    const projectTemplates = await projectTemplatesDAL.find({
      orgId: actor.orgId
    });

    return projectTemplates;
  };

  const createProjectTemplate = async (
    { roles, environments, ...params }: TCreateProjectTemplateDTO,
    actor: OrgServiceActor
  ) => {
    const { permission } = await permissionService.getOrgPermission(
      actor.type,
      actor.id,
      actor.orgId,
      actor.authMethod,
      actor.orgId
    );

    ForbiddenError.from(permission).throwUnlessCan(OrgPermissionActions.Create, OrgPermissionSubjects.ProjectTemplates);

    const plan = await licenseService.getPlan(actor.orgId);

    if (!plan.projectTemplates)
      throw new BadRequestError({
        message: "Failed to create project template due to plan restriction. Upgrade plan to access project templates."
      });

    const projectTemplate = await projectTemplatesDAL.create({
      ...params,
      roles: JSON.stringify(roles.map((role) => ({ ...role, permissions: packRules(role.permissions) }))),
      environments: JSON.stringify(environments),
      orgId: actor.orgId
    });

    return projectTemplate;
  };

  const updateProjectTemplateById = async (
    id: string,
    { roles, environments, ...params }: TUpdateProjectTemplateDTO,
    actor: OrgServiceActor
  ) => {
    const { permission } = await permissionService.getOrgPermission(
      actor.type,
      actor.id,
      actor.orgId,
      actor.authMethod,
      actor.orgId
    );

    ForbiddenError.from(permission).throwUnlessCan(OrgPermissionActions.Edit, OrgPermissionSubjects.ProjectTemplates);

    const plan = await licenseService.getPlan(actor.orgId);

    if (!plan.projectTemplates)
      throw new BadRequestError({
        message: "Failed to update project template due to plan restriction. Upgrade plan to access project templates."
      });

    const projectTemplate = await projectTemplatesDAL.updateById(id, {
      ...params,
      roles: roles
        ? JSON.stringify(roles.map((role) => ({ ...role, permissions: packRules(role.permissions) })))
        : undefined,
      environments: environments ? JSON.stringify(environments) : undefined
    });

    return projectTemplate;
  };

  const deleteProjectTemplateById = async (id: string, actor: OrgServiceActor) => {
    const { permission } = await permissionService.getOrgPermission(
      actor.type,
      actor.id,
      actor.orgId,
      actor.authMethod,
      actor.orgId
    );

    ForbiddenError.from(permission).throwUnlessCan(OrgPermissionActions.Delete, OrgPermissionSubjects.ProjectTemplates);

    const plan = await licenseService.getPlan(actor.orgId);

    if (!plan.projectTemplates)
      throw new BadRequestError({
        message: "Failed to update project template due to plan restriction. Upgrade plan to access project templates."
      });

    const projectTemplate = await projectTemplatesDAL.deleteById(id);

    return projectTemplate;
  };

  const applyProjectTemplateById = async (templateId: string, projectId: string, actor: OrgServiceActor) => {
    const { permission } = await permissionService.getOrgPermission(
      actor.type,
      actor.id,
      actor.orgId,
      actor.authMethod,
      actor.orgId
    );

    ForbiddenError.from(permission).throwUnlessCan(OrgPermissionActions.Read, OrgPermissionSubjects.ProjectTemplates);

    const plan = await licenseService.getPlan(actor.orgId);

    if (!plan.projectTemplates)
      throw new BadRequestError({
        message: "Failed to apply project template due to plan restriction. Upgrade plan to access project templates."
      });

    const projectTemplate = await projectTemplatesDAL.findById(templateId);

    if (!projectTemplate) throw new NotFoundError({ message: `Project template with ID ${templateId} not found.` });

    // TODO
    return { projectTemplate };
  };

  return {
    listProjectTemplatesByOrg,
    createProjectTemplate,
    updateProjectTemplateById,
    deleteProjectTemplateById,
    applyProjectTemplateById
  };
};
