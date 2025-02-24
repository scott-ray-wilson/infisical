import { ForbiddenError, MongoAbility, RawRuleOf } from "@casl/ability";
import { PackRule, packRules, unpackRules } from "@casl/ability/extra";
import OpenAI from "openai";
import { zodResponseFormat } from "openai/helpers/zod";
import { z } from "zod";

import { ActionProjectType, ProjectMembershipRole, TableName, TSecretFolders } from "@app/db/schemas";
import { TPermissionServiceFactory } from "@app/ee/services/permission/permission-service";
import {
  ProjectPermissionActions,
  ProjectPermissionDynamicSecretActions,
  ProjectPermissionKmipActions,
  ProjectPermissionSecretSyncActions,
  ProjectPermissionSet,
  ProjectPermissionSub
} from "@app/ee/services/permission/project-permission";
import { BadRequestError, NotFoundError } from "@app/lib/errors";
import { logger } from "@app/lib/logger";
import { OrgServiceActor } from "@app/lib/types";
import { UnpackedPermissionSchema } from "@app/server/routes/sanitizedSchema/permission";
import { TSecretFolderServiceFactory } from "@app/services/secret-folder/secret-folder-service";

import { ActorAuthMethod } from "../auth/auth-type";
import { TIdentityProjectMembershipRoleDALFactory } from "../identity-project/identity-project-membership-role-dal";
import { TProjectDALFactory } from "../project/project-dal";
import { TProjectUserMembershipRoleDALFactory } from "../project-membership/project-user-membership-role-dal";
import { TProjectRoleDALFactory } from "./project-role-dal";
import { getPredefinedRoles } from "./project-role-fns";
import {
  ProjectRoleServiceIdentifierType,
  TCreateRoleDTO,
  TDeleteRoleDTO,
  TGetRoleDetailsDTO,
  TListRolesDTO,
  TUpdateRoleDTO
} from "./project-role-types";

type TProjectRoleServiceFactoryDep = {
  projectRoleDAL: TProjectRoleDALFactory;
  projectDAL: Pick<TProjectDALFactory, "findProjectBySlug">;
  permissionService: Pick<TPermissionServiceFactory, "getProjectPermission" | "getUserProjectPermission">;
  identityProjectMembershipRoleDAL: TIdentityProjectMembershipRoleDALFactory;
  projectUserMembershipRoleDAL: TProjectUserMembershipRoleDALFactory;
  folderService: TSecretFolderServiceFactory;
};

export type TProjectRoleServiceFactory = ReturnType<typeof projectRoleServiceFactory>;

const GeneralPolicyActionSchema = z.object({
  read: z.boolean(),
  edit: z.boolean(),
  delete: z.boolean(),
  create: z.boolean()
});

const CmekPolicyActionSchema = z.object({
  read: z.boolean(),
  edit: z.boolean(),
  delete: z.boolean(),
  create: z.boolean(),
  encrypt: z.boolean(),
  decrypt: z.boolean()
});

export enum PermissionConditionOperators {
  $IN = "$in",
  $EQ = "$eq",
  $NEQ = "$ne",
  $GLOB = "$glob"
}

const DynamicSecretPolicyActionSchema = z.object({
  [ProjectPermissionDynamicSecretActions.ReadRootCredential]: z.boolean(),
  [ProjectPermissionDynamicSecretActions.EditRootCredential]: z.boolean(),
  [ProjectPermissionDynamicSecretActions.DeleteRootCredential]: z.boolean(),
  [ProjectPermissionDynamicSecretActions.CreateRootCredential]: z.boolean(),
  [ProjectPermissionDynamicSecretActions.Lease]: z.boolean()
});

const SecretSyncPolicyActionSchema = z.object({
  [ProjectPermissionSecretSyncActions.Read]: z.boolean(),
  [ProjectPermissionSecretSyncActions.Create]: z.boolean(),
  [ProjectPermissionSecretSyncActions.Edit]: z.boolean(),
  [ProjectPermissionSecretSyncActions.Delete]: z.boolean(),
  [ProjectPermissionSecretSyncActions.SyncSecrets]: z.boolean(),
  [ProjectPermissionSecretSyncActions.ImportSecrets]: z.boolean(),
  [ProjectPermissionSecretSyncActions.RemoveSecrets]: z.boolean()
});

const KmipPolicyActionSchema = z.object({
  [ProjectPermissionKmipActions.ReadClients]: z.boolean(),
  [ProjectPermissionKmipActions.CreateClients]: z.boolean(),
  [ProjectPermissionKmipActions.UpdateClients]: z.boolean(),
  [ProjectPermissionKmipActions.DeleteClients]: z.boolean(),
  [ProjectPermissionKmipActions.GenerateClientCertificates]: z.boolean()
});

const SecretRollbackPolicyActionSchema = z.object({
  read: z.boolean(),
  create: z.boolean()
});

const WorkspacePolicyActionSchema = z.object({
  edit: z.boolean(),
  delete: z.boolean()
});

const ConditionSchema = z
  .object({
    operator: z.nativeEnum(PermissionConditionOperators),
    lhs: z.enum(["secretPath"]),
    rhs: z.string()
  })
  .array()
  .refine(
    (el) => {
      const lhsOperatorSet = new Set<string>();
      for (let i = 0; i < el.length; i += 1) {
        const { lhs, operator } = el[i];
        if (lhsOperatorSet.has(`${lhs}-${operator}`)) {
          return false;
        }
        lhsOperatorSet.add(`${lhs}-${operator}`);
      }
      return true;
    },
    { message: "Duplicate operator found for a condition" }
  )
  .refine(
    (val) =>
      val
        .filter((el) => el.lhs === "secretPath" && el.operator !== PermissionConditionOperators.$GLOB)
        .every((el) =>
          el.operator === PermissionConditionOperators.$IN
            ? el.rhs.split(",").every((i) => i.trim().startsWith("/"))
            : el.rhs.trim().startsWith("/")
        ),
    { message: "Invalid Secret Path. Must start with '/'" }
  );

const schema = z
  .object({
    [ProjectPermissionSub.Secrets]: GeneralPolicyActionSchema.extend({
      inverted: z.boolean(),
      conditions: ConditionSchema
    }).array(),
    [ProjectPermissionSub.SecretFolders]: GeneralPolicyActionSchema.extend({
      inverted: z.boolean(),
      conditions: ConditionSchema
    }).array(),
    [ProjectPermissionSub.SecretImports]: GeneralPolicyActionSchema.extend({
      inverted: z.boolean(),
      conditions: ConditionSchema
    }).array(),
    [ProjectPermissionSub.DynamicSecrets]: DynamicSecretPolicyActionSchema.extend({
      inverted: z.boolean(),
      conditions: ConditionSchema
    }).array(),
    [ProjectPermissionSub.Identity]: GeneralPolicyActionSchema.extend({
      inverted: z.boolean(),
      conditions: ConditionSchema
    }).array(),
    [ProjectPermissionSub.Member]: GeneralPolicyActionSchema.array(),
    [ProjectPermissionSub.Groups]: GeneralPolicyActionSchema.array(),
    [ProjectPermissionSub.Role]: GeneralPolicyActionSchema.array(),
    [ProjectPermissionSub.Integrations]: GeneralPolicyActionSchema.array(),
    [ProjectPermissionSub.Webhooks]: GeneralPolicyActionSchema.array(),
    [ProjectPermissionSub.ServiceTokens]: GeneralPolicyActionSchema.array(),
    [ProjectPermissionSub.Settings]: GeneralPolicyActionSchema.array(),
    [ProjectPermissionSub.Environments]: GeneralPolicyActionSchema.array(),
    [ProjectPermissionSub.AuditLogs]: GeneralPolicyActionSchema.array(),
    [ProjectPermissionSub.IpAllowList]: GeneralPolicyActionSchema.array(),
    [ProjectPermissionSub.CertificateAuthorities]: GeneralPolicyActionSchema.array(),
    [ProjectPermissionSub.Certificates]: GeneralPolicyActionSchema.array(),
    [ProjectPermissionSub.PkiAlerts]: GeneralPolicyActionSchema.array(),
    [ProjectPermissionSub.PkiCollections]: GeneralPolicyActionSchema.array(),
    [ProjectPermissionSub.CertificateTemplates]: GeneralPolicyActionSchema.array(),
    [ProjectPermissionSub.SshCertificateAuthorities]: GeneralPolicyActionSchema.array(),
    [ProjectPermissionSub.SshCertificates]: GeneralPolicyActionSchema.array(),
    [ProjectPermissionSub.SshCertificateTemplates]: GeneralPolicyActionSchema.array(),
    [ProjectPermissionSub.SecretApproval]: GeneralPolicyActionSchema.array(),
    [ProjectPermissionSub.SecretRollback]: SecretRollbackPolicyActionSchema.array(),
    [ProjectPermissionSub.Project]: WorkspacePolicyActionSchema.array(),
    [ProjectPermissionSub.Tags]: GeneralPolicyActionSchema.array(),
    [ProjectPermissionSub.SecretRotation]: GeneralPolicyActionSchema.array(),
    [ProjectPermissionSub.Kms]: GeneralPolicyActionSchema.array(),
    [ProjectPermissionSub.Cmek]: CmekPolicyActionSchema.array(),
    [ProjectPermissionSub.SecretSyncs]: SecretSyncPolicyActionSchema.array(),
    [ProjectPermissionSub.Kmip]: KmipPolicyActionSchema.array()
  })
  .partial();
const unpackPermissions = (permissions: unknown) =>
  UnpackedPermissionSchema.array().parse(
    unpackRules((permissions || []) as PackRule<RawRuleOf<MongoAbility<ProjectPermissionSet>>>[])
  );

export const projectRoleServiceFactory = ({
  projectRoleDAL,
  permissionService,
  identityProjectMembershipRoleDAL,
  projectUserMembershipRoleDAL,
  projectDAL,
  folderService
}: TProjectRoleServiceFactoryDep) => {
  const createRole = async ({ data, actor, actorId, actorAuthMethod, actorOrgId, filter }: TCreateRoleDTO) => {
    let projectId = "";
    if (filter.type === ProjectRoleServiceIdentifierType.SLUG) {
      const project = await projectDAL.findProjectBySlug(filter.projectSlug, actorOrgId);
      if (!project) throw new NotFoundError({ message: "Project not found" });
      projectId = project.id;
    } else {
      projectId = filter.projectId;
    }

    const { permission } = await permissionService.getProjectPermission({
      actor,
      actorId,
      projectId,
      actorAuthMethod,
      actorOrgId,
      actionProjectType: ActionProjectType.Any
    });
    ForbiddenError.from(permission).throwUnlessCan(ProjectPermissionActions.Create, ProjectPermissionSub.Role);
    const existingRole = await projectRoleDAL.findOne({ slug: data.slug, projectId });
    if (existingRole) {
      throw new BadRequestError({ name: "Create Role", message: "Project role with same slug already exists" });
    }

    const role = await projectRoleDAL.create({
      ...data,
      projectId
    });
    return { ...role, permissions: unpackPermissions(role.permissions) };
  };

  const getRoleBySlug = async ({
    actor,
    actorId,
    actorAuthMethod,
    actorOrgId,
    roleSlug,
    filter
  }: TGetRoleDetailsDTO) => {
    let projectId = "";
    if (filter.type === ProjectRoleServiceIdentifierType.SLUG) {
      const project = await projectDAL.findProjectBySlug(filter.projectSlug, actorOrgId);
      if (!project) throw new NotFoundError({ message: "Project not found" });
      projectId = project.id;
    } else {
      projectId = filter.projectId;
    }

    const { permission } = await permissionService.getProjectPermission({
      actor,
      actorId,
      projectId,
      actorAuthMethod,
      actorOrgId,
      actionProjectType: ActionProjectType.Any
    });
    ForbiddenError.from(permission).throwUnlessCan(ProjectPermissionActions.Read, ProjectPermissionSub.Role);
    if (roleSlug !== "custom" && Object.values(ProjectMembershipRole).includes(roleSlug as ProjectMembershipRole)) {
      const predefinedRole = getPredefinedRoles(projectId, roleSlug as ProjectMembershipRole)[0];
      return { ...predefinedRole, permissions: UnpackedPermissionSchema.array().parse(predefinedRole.permissions) };
    }

    const customRole = await projectRoleDAL.findOne({ slug: roleSlug, projectId });
    if (!customRole) throw new NotFoundError({ message: `Project role with slug '${roleSlug}' not found` });
    return { ...customRole, permissions: unpackPermissions(customRole.permissions) };
  };

  const updateRole = async ({ roleId, actorOrgId, actorAuthMethod, actorId, actor, data }: TUpdateRoleDTO) => {
    const projectRole = await projectRoleDAL.findById(roleId);
    if (!projectRole) throw new NotFoundError({ message: "Project role not found", name: "Delete role" });

    const { permission } = await permissionService.getProjectPermission({
      actor,
      actorId,
      projectId: projectRole.projectId,
      actorAuthMethod,
      actorOrgId,
      actionProjectType: ActionProjectType.Any
    });
    ForbiddenError.from(permission).throwUnlessCan(ProjectPermissionActions.Edit, ProjectPermissionSub.Role);

    if (data?.slug) {
      const existingRole = await projectRoleDAL.findOne({ slug: data.slug, projectId: projectRole.projectId });
      if (existingRole && existingRole.id !== roleId)
        throw new BadRequestError({ name: "Update Role", message: "Project role with the same slug already exists" });
    }

    const updatedRole = await projectRoleDAL.updateById(projectRole.id, {
      ...data,
      permissions: data.permissions ? data.permissions : undefined
    });
    if (!updatedRole) throw new NotFoundError({ message: "Project role not found", name: "Update role" });

    return { ...updatedRole, permissions: unpackPermissions(updatedRole.permissions) };
  };

  const deleteRole = async ({ actor, actorId, actorAuthMethod, actorOrgId, roleId }: TDeleteRoleDTO) => {
    const projectRole = await projectRoleDAL.findById(roleId);
    if (!projectRole) throw new NotFoundError({ message: "Project role not found", name: "Delete role" });
    const { permission } = await permissionService.getProjectPermission({
      actor,
      actorId,
      projectId: projectRole.projectId,
      actorAuthMethod,
      actorOrgId,
      actionProjectType: ActionProjectType.Any
    });
    ForbiddenError.from(permission).throwUnlessCan(ProjectPermissionActions.Delete, ProjectPermissionSub.Role);

    const identityRole = await identityProjectMembershipRoleDAL.findOne({ customRoleId: roleId });
    const projectUserRole = await projectUserMembershipRoleDAL.findOne({ customRoleId: roleId });

    if (identityRole) {
      throw new BadRequestError({
        message: "The role is assigned to one or more identities. Make sure to unassign them before deleting the role.",
        name: "Delete role"
      });
    }
    if (projectUserRole) {
      throw new BadRequestError({
        message: "The role is assigned to one or more users. Make sure to unassign them before deleting the role.",
        name: "Delete role"
      });
    }

    const deletedRole = await projectRoleDAL.deleteById(roleId);
    if (!deletedRole) throw new NotFoundError({ message: "Project role not found", name: "Delete role" });

    return { ...deletedRole, permissions: unpackPermissions(deletedRole.permissions) };
  };

  const listRoles = async ({ actorOrgId, actorAuthMethod, actorId, actor, filter }: TListRolesDTO) => {
    let projectId = "";
    if (filter.type === ProjectRoleServiceIdentifierType.SLUG) {
      const project = await projectDAL.findProjectBySlug(filter.projectSlug, actorOrgId);
      if (!project) throw new BadRequestError({ message: "Project not found" });
      projectId = project.id;
    } else {
      projectId = filter.projectId;
    }

    const { permission } = await permissionService.getProjectPermission({
      actor,
      actorId,
      projectId,
      actorAuthMethod,
      actorOrgId,
      actionProjectType: ActionProjectType.Any
    });
    ForbiddenError.from(permission).throwUnlessCan(ProjectPermissionActions.Read, ProjectPermissionSub.Role);
    const customRoles = await projectRoleDAL.find(
      { projectId },
      { sort: [[`${TableName.ProjectRoles}.slug` as "slug", "asc"]] }
    );
    const roles = [...getPredefinedRoles(projectId), ...(customRoles || [])];

    return roles;
  };

  const getUserPermission = async (
    userId: string,
    projectId: string,
    actorAuthMethod: ActorAuthMethod,
    actorOrgId: string | undefined
  ) => {
    const { permission, membership } = await permissionService.getUserProjectPermission({
      userId,
      projectId,
      authMethod: actorAuthMethod,
      userOrgId: actorOrgId,
      actionProjectType: ActionProjectType.Any
    });
    return { permissions: packRules(permission.rules), membership };
  };

  type TFolderWithPath = Partial<TSecretFolders> & { path: string };

  const fetchAllProjectFolders = async (
    workspaceId: string,
    environment: string,
    currentPath: string,
    actor: OrgServiceActor
  ): Promise<TFolderWithPath[]> => {
    // Get folders at current path
    const folders = await folderService.getFolders({
      actorId: actor.id,
      actor: actor.type,
      actorAuthMethod: actor.authMethod,
      actorOrgId: actor.orgId,
      environment,
      projectId: workspaceId,
      path: currentPath
    });
    const parent = { name: currentPath, id: folders[0]?.parentId ?? "root", path: currentPath };

    // Recursively fetch subfolders for each folder
    const subfolderPromises = folders.map(async (folder) => {
      const newPath = currentPath === "/" ? `/${folder.name}` : `${currentPath}/${folder.name}`;

      const subfolders = await fetchAllProjectFolders(workspaceId, environment, newPath, actor);

      return [{ ...folder, path: newPath }, ...subfolders.map((nestedFolder) => ({ ...nestedFolder, path: newPath }))];
    });

    // Wait for all subfolder requests to complete and flatten results
    const nestedResults = await Promise.all(subfolderPromises);
    return [parent, ...nestedResults.flat()];
  };

  const generatePermission = async (
    { prompt, projectId }: { prompt: string; projectId: string },
    actor: OrgServiceActor
  ) => {
    const { permission } = await permissionService.getProjectPermission({
      actor: actor.type,
      actorId: actor.id,
      projectId,
      actorAuthMethod: actor.authMethod,
      actorOrgId: actor.orgId,
      actionProjectType: ActionProjectType.Any
    });

    const openai = new OpenAI();

    const folders = await fetchAllProjectFolders(projectId, "dev", "/", actor);

    ForbiddenError.from(permission).throwUnlessCan(ProjectPermissionActions.Edit, ProjectPermissionSub.Role);

    const completion = await openai.beta.chat.completions.parse({
      model: "gpt-4o-2024-08-06",
      store: true,
      response_format: zodResponseFormat(schema, "permissions"),
      messages: [
        {
          role: "system",
          content: `
          You are a security permissions expert responsible for generating precise access control schemas. Your task is to analyze folder hierarchies and create permission rules that exactly match user requirements.
          
          When generating permissions schemas, follow these critical security rules:

          Path Construction Rules:
          - Always use leading slashes in paths (e.g., '/folder' not 'folder')
          - Use '**' in glob patterns to indicate nested folder access (e.g., '/folder/**')
          - Only use paths that are explicitly provided in the folder array
          - Never infer or generate paths that weren't provided
          
          Access Control Rules:
          - Listing a folder path automatically blocks access to all child folders
          - To block access to a specific folder and it's descendants, use '/folder' (not '/folder/**')
          - Place all inverted permissions (deny rules) at the end of the array
          - You should never have only an inverted policy, do not give responses with a single inverted element
          - Inverted permissions only apply to actions that have true as their value
          
          Validation Requirements:
          - Verify that all paths are valid against the provided folder hierarchy
          - Double-check that glob patterns are correctly formatted
          - Ensure no conflicting permissions are generated
           
           project folders: ${folders.toString()}.`
        },
        {
          role: "user",
          content: prompt
        }
      ]
    });

    logger.warn(completion);

    const permissions = completion.choices[0].message.parsed;

    return permissions;
  };

  return { createRole, updateRole, deleteRole, listRoles, getUserPermission, getRoleBySlug, generatePermission };
};
