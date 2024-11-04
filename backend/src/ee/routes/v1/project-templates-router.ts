import { packRules } from "@casl/ability/extra";
import slugify from "@sindresorhus/slugify";
import { z } from "zod";

import { ProjectTemplatesSchema } from "@app/db/schemas";
import { EventType } from "@app/ee/services/audit-log/audit-log-types";
import { ProjectPermissionV2Schema } from "@app/ee/services/permission/project-permission";
import { ProjectTemplates } from "@app/lib/api-docs";
import { readLimit, writeLimit } from "@app/server/config/rateLimiter";
import { verifyAuth } from "@app/server/plugins/auth/verify-auth";
import { AuthMode } from "@app/services/auth/auth-type";

const SlugSchema = z
  .string()
  .trim()
  .min(1)
  .max(32)
  .refine((val) => val.toLowerCase() === val, "Name must be lowercase")
  .refine((v) => slugify(v) === v, {
    message: "Name must be slug friendly"
  });

const ProjectTemplateRolesSchema = z
  .object({
    name: z.string().trim().min(1),
    slug: SlugSchema,
    description: z.string().trim().optional(),
    permissions: ProjectPermissionV2Schema.array()
  })
  .array();

const ProjectTemplateEnvironmentsSchema = z
  .object({
    name: z.string().trim().min(1),
    slug: SlugSchema,
    position: z.number().min(1)
  })
  .array();

export const registerProjectTemplatesRouter = async (server: FastifyZodProvider) => {
  server.route({
    method: "GET",
    url: "/",
    config: {
      rateLimit: readLimit
    },
    schema: {
      description: "List project templates for the current organization.",
      response: {
        200: z.object({
          projectTemplates: ProjectTemplatesSchema.array()
        })
      }
    },
    onRequest: verifyAuth([AuthMode.JWT, AuthMode.IDENTITY_ACCESS_TOKEN]),
    handler: async (req) => {
      const projectTemplates = await server.services.projectTemplates.listProjectTemplatesByOrg(req.permission);

      await server.services.auditLog.createAuditLog({
        ...req.auditLogInfo,
        orgId: req.permission.orgId,
        event: {
          type: EventType.GET_PROJECT_TEMPLATES
        }
      });

      return { projectTemplates };
    }
  });

  server.route({
    method: "GET",
    url: "/",
    config: {
      rateLimit: readLimit
    },
    schema: {
      description: "List project templates for the current organization.",
      response: {
        200: z.object({
          projectTemplates: ProjectTemplatesSchema.array()
        })
      }
    },
    onRequest: verifyAuth([AuthMode.JWT, AuthMode.IDENTITY_ACCESS_TOKEN]),
    handler: async (req) => {
      const projectTemplates = await server.services.projectTemplates.listProjectTemplatesByOrg(req.permission);

      await server.services.auditLog.createAuditLog({
        ...req.auditLogInfo,
        orgId: req.permission.orgId,
        event: {
          type: EventType.GET_PROJECT_TEMPLATES
        }
      });

      return { projectTemplates };
    }
  });

  server.route({
    method: "POST",
    url: "/",
    config: {
      rateLimit: writeLimit
    },
    schema: {
      description: "Create a project template.",
      body: z.object({
        name: SlugSchema.describe(ProjectTemplates.CREATE.name),
        description: z.string().trim().optional().describe(ProjectTemplates.CREATE.description),
        roles: ProjectTemplateRolesSchema.default([]).describe(ProjectTemplates.CREATE.roles),
        environments: ProjectTemplateEnvironmentsSchema.default([
          { name: "Development", slug: "dev", position: 1 },
          { name: "Staging", slug: "staging", position: 2 },
          { name: "Production", slug: "prod", position: 3 }
        ]).describe(ProjectTemplates.CREATE.environments)
      }),
      response: {
        200: z.object({
          projectTemplate: ProjectTemplatesSchema
        })
      }
    },
    onRequest: verifyAuth([AuthMode.JWT, AuthMode.IDENTITY_ACCESS_TOKEN]),
    handler: async (req) => {
      const projectTemplate = await server.services.projectTemplates.createProjectTemplate(req.body, req.permission);

      await server.services.auditLog.createAuditLog({
        ...req.auditLogInfo,
        orgId: req.permission.orgId,
        event: {
          type: EventType.CREATE_PROJECT_TEMPLATE,
          metadata: req.body
        }
      });

      return { projectTemplate };
    }
  });

  server.route({
    method: "PATCH",
    url: "/:templateId",
    config: {
      rateLimit: writeLimit
    },
    schema: {
      description: "Update a project template.",
      params: z.object({ templateId: z.string().uuid().describe(ProjectTemplates.APPLY.templateId) }),
      body: z.object({
        name: SlugSchema.optional().describe(ProjectTemplates.UPDATE.name),
        description: z.string().trim().optional().describe(ProjectTemplates.UPDATE.description),
        roles: ProjectTemplateRolesSchema.optional().describe(ProjectTemplates.UPDATE.roles),
        environments: ProjectTemplateEnvironmentsSchema.optional().describe(ProjectTemplates.UPDATE.environments)
      }),
      response: {
        200: z.object({
          projectTemplate: ProjectTemplatesSchema
        })
      }
    },
    onRequest: verifyAuth([AuthMode.JWT, AuthMode.IDENTITY_ACCESS_TOKEN]),
    handler: async (req) => {
      const projectTemplate = await server.services.projectTemplates.updateProjectTemplateById(
        req.params.templateId,
        req.body,
        req.permission
      );

      await server.services.auditLog.createAuditLog({
        ...req.auditLogInfo,
        orgId: req.permission.orgId,
        event: {
          type: EventType.UPDATE_PROJECT_TEMPLATE,
          metadata: {
            templateId: req.params.templateId,
            ...req.body
          }
        }
      });

      return { projectTemplate };
    }
  });

  server.route({
    method: "DELETE",
    url: "/:templateId",
    config: {
      rateLimit: writeLimit
    },
    schema: {
      description: "Delete a project template.",
      params: z.object({ templateId: z.string().uuid().describe(ProjectTemplates.APPLY.templateId) }),

      response: {
        200: z.object({
          projectTemplate: ProjectTemplatesSchema
        })
      }
    },
    onRequest: verifyAuth([AuthMode.JWT, AuthMode.IDENTITY_ACCESS_TOKEN]),
    handler: async (req) => {
      const projectTemplate = await server.services.projectTemplates.deleteProjectTemplateById(
        req.params.templateId,

        req.permission
      );

      await server.services.auditLog.createAuditLog({
        ...req.auditLogInfo,
        orgId: req.permission.orgId,
        event: {
          type: EventType.DELETE_PROJECT_TEMPLATE,
          metadata: {
            templateId: req.params.templateId
          }
        }
      });

      return { projectTemplate };
    }
  });

  server.route({
    method: "POST",
    url: "/:templateId/apply",
    config: {
      rateLimit: writeLimit
    },
    schema: {
      description: "Apply a project template to an existing project.",
      params: z.object({ templateId: z.string().uuid().describe(ProjectTemplates.APPLY.templateId) }),
      body: z.object({
        projectId: z.string().trim().describe(ProjectTemplates.APPLY.projectId)
      }),
      response: {
        200: z.object({
          projectTemplate: ProjectTemplatesSchema
        })
      }
    },
    onRequest: verifyAuth([AuthMode.JWT, AuthMode.IDENTITY_ACCESS_TOKEN]),
    handler: async (req) => {
      const projectTemplate = await server.services.projectTemplates.applyProjectTemplateById(
        req.params.templateId,
        req.body.projectId,
        req.permission
      );

      await server.services.auditLog.createAuditLog({
        ...req.auditLogInfo,
        orgId: req.permission.orgId,
        event: {
          type: EventType.APPLY_PROJECT_TEMPLATE,
          metadata: {
            templateId: req.params.templateId,
            ...req.body
          }
        }
      });

      return projectTemplate;
    }
  });
};
