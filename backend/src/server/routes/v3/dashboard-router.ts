import { z } from "zod";

import { SecretFoldersSchema, SecretImportsSchema, SecretTagsSchema } from "@app/db/schemas";
import { EventType, UserAgentType } from "@app/ee/services/audit-log/audit-log-types";
import { DASHBOARD } from "@app/lib/api-docs";
import { BadRequestError } from "@app/lib/errors";
import { removeTrailingSlash } from "@app/lib/fn";
import { OrderByDirection } from "@app/lib/types";
import { secretsLimit } from "@app/server/config/rateLimiter";
import { getTelemetryDistinctId } from "@app/server/lib/telemetry";
import { getUserAgentType } from "@app/server/plugins/audit-log";
import { verifyAuth } from "@app/server/plugins/auth/verify-auth";
import { SanitizedDynamicSecretSchema, secretRawSchema } from "@app/server/routes/sanitizedSchemas";
import { AuthMode } from "@app/services/auth/auth-type";
import { SecretsOrderBy } from "@app/services/secret/secret-types";
import { PostHogEventTypes } from "@app/services/telemetry/telemetry-types";

export const registerDashboardRouter = async (server: FastifyZodProvider) => {
  server.route({
    method: "GET",
    url: "/secrets-details",
    config: {
      rateLimit: secretsLimit
    },
    schema: {
      description: "List project secrets details",
      security: [
        {
          bearerAuth: []
        }
      ],
      querystring: z.object({
        projectId: z.string().trim().describe(DASHBOARD.SECRET_DETAILS_LIST.projectId),
        environment: z.string().trim().describe(DASHBOARD.SECRET_DETAILS_LIST.environment),
        secretPath: z
          .string()
          .trim()
          .default("/")
          .transform(removeTrailingSlash)
          .describe(DASHBOARD.SECRET_DETAILS_LIST.secretPath),
        offset: z.coerce.number().min(0).optional().default(0).describe(DASHBOARD.SECRET_DETAILS_LIST.offset),
        limit: z.coerce.number().min(1).max(100).optional().default(100).describe(DASHBOARD.SECRET_DETAILS_LIST.limit),
        orderBy: z
          .nativeEnum(SecretsOrderBy)
          .default(SecretsOrderBy.Name)
          .describe(DASHBOARD.SECRET_DETAILS_LIST.orderBy)
          .optional(),
        orderDirection: z
          .nativeEnum(OrderByDirection)
          .default(OrderByDirection.ASC)
          .describe(DASHBOARD.SECRET_DETAILS_LIST.orderDirection)
          .optional(),
        search: z.string().trim().describe(DASHBOARD.SECRET_DETAILS_LIST.search).optional(),
        includeSecrets: z.coerce
          .boolean()
          .optional()
          .default(true)
          .describe(DASHBOARD.SECRET_DETAILS_LIST.includeSecrets),
        includeFolders: z.coerce
          .boolean()
          .optional()
          .default(true)
          .describe(DASHBOARD.SECRET_DETAILS_LIST.includeFolders),
        includeDynamicSecrets: z.coerce
          .boolean()
          .optional()
          .default(true)
          .describe(DASHBOARD.SECRET_DETAILS_LIST.includeDynamicSecrets),
        includeImports: z.coerce
          .boolean()
          .optional()
          .default(true)
          .describe(DASHBOARD.SECRET_DETAILS_LIST.includeImports)
      }),
      response: {
        200: z.object({
          imports: SecretImportsSchema.omit({ importEnv: true })
            .extend({
              importEnv: z.object({ name: z.string(), slug: z.string(), id: z.string() })
            })
            .array(),
          folders: SecretFoldersSchema.array(),
          dynamicSecrets: SanitizedDynamicSecretSchema.array(),
          secrets: secretRawSchema
            .extend({
              secretPath: z.string().optional(),
              tags: SecretTagsSchema.pick({
                id: true,
                slug: true,
                color: true
              })
                .extend({ name: z.string() })
                .array()
                .optional()
            })
            .array(),
          totalImportCount: z.number(),
          totalFolderCount: z.number(),
          totalDynamicSecretCount: z.number(),
          totalSecretCount: z.number(),
          totalCount: z.number()
        })
      }
    },
    onRequest: verifyAuth([AuthMode.JWT]),
    handler: async (req) => {
      const {
        secretPath,
        environment,
        projectId,
        limit,
        offset,
        search,
        orderBy,
        orderDirection,
        includeFolders,
        includeSecrets,
        includeDynamicSecrets,
        includeImports
      } = req.query;

      if (!projectId || !environment) throw new BadRequestError({ message: "Missing workspace id or environment" });

      const { shouldUseSecretV2Bridge: enablePagination } = await server.services.projectBot.getBotKey(projectId);

      let remainingLimit = limit;
      let adjustedOffset = offset;

      let imports: Awaited<ReturnType<typeof server.services.secretImport.getImports>> = [];
      let folders: Awaited<ReturnType<typeof server.services.folder.getFolders>> = [];
      let secrets: Awaited<ReturnType<typeof server.services.secret.getSecretsRaw>>["secrets"] = [];
      let dynamicSecrets: Awaited<ReturnType<typeof server.services.dynamicSecret.list>> = [];

      let totalImportCount = 0;
      let totalFolderCount = 0;
      let totalDynamicSecretCount = 0;
      let totalSecretCount = 0;

      if (includeImports) {
        totalImportCount = await server.services.secretImport.getProjectImportCount({
          actorId: req.permission.id,
          actor: req.permission.type,
          actorAuthMethod: req.permission.authMethod,
          actorOrgId: req.permission.orgId,
          projectId,
          environment,
          path: secretPath,
          search
        });

        if (remainingLimit > 0 && totalImportCount > adjustedOffset) {
          imports = await server.services.secretImport.getImports({
            actorId: req.permission.id,
            actor: req.permission.type,
            actorAuthMethod: req.permission.authMethod,
            actorOrgId: req.permission.orgId,
            projectId,
            environment,
            path: secretPath,
            search,
            ...(enablePagination && {
              limit: remainingLimit,
              offset: adjustedOffset
            })
          });

          await server.services.auditLog.createAuditLog({
            ...req.auditLogInfo,
            projectId: req.query.projectId,
            event: {
              type: EventType.GET_SECRET_IMPORTS,
              metadata: {
                environment: req.query.environment,
                folderId: imports?.[0]?.folderId,
                numberOfImports: imports.length
              }
            }
          });

          remainingLimit -= imports.length;
          adjustedOffset = 0;
        } else {
          adjustedOffset = Math.max(0, adjustedOffset - totalImportCount);
        }
      }

      if (includeFolders) {
        totalFolderCount = await server.services.folder.getProjectFolderCount({
          actorId: req.permission.id,
          actor: req.permission.type,
          actorAuthMethod: req.permission.authMethod,
          actorOrgId: req.permission.orgId,
          projectId: req.query.projectId,
          path: secretPath,
          environment,
          search
        });

        if (remainingLimit > 0 && totalFolderCount > adjustedOffset) {
          folders = await server.services.folder.getFolders({
            actorId: req.permission.id,
            actor: req.permission.type,
            actorAuthMethod: req.permission.authMethod,
            actorOrgId: req.permission.orgId,
            projectId,
            environment,
            path: secretPath,
            orderBy,
            orderDirection,
            search,
            ...(enablePagination && {
              limit: remainingLimit,
              offset: adjustedOffset
            })
          });

          remainingLimit -= folders.length;
          adjustedOffset = 0;
        } else {
          adjustedOffset = Math.max(0, adjustedOffset - totalFolderCount);
        }
      }

      if (includeDynamicSecrets) {
        totalDynamicSecretCount = await server.services.dynamicSecret.getCount({
          actor: req.permission.type,
          actorId: req.permission.id,
          actorAuthMethod: req.permission.authMethod,
          actorOrgId: req.permission.orgId,
          projectId,
          search,
          environmentSlug: environment,
          path: secretPath
        });

        if (remainingLimit > 0 && totalDynamicSecretCount > adjustedOffset) {
          dynamicSecrets = await server.services.dynamicSecret.list({
            actor: req.permission.type,
            actorId: req.permission.id,
            actorAuthMethod: req.permission.authMethod,
            actorOrgId: req.permission.orgId,
            projectId,
            search,
            orderBy,
            orderDirection,
            environmentSlug: environment,
            path: secretPath,
            ...(enablePagination && {
              limit: remainingLimit,
              offset: adjustedOffset
            })
          });

          remainingLimit -= dynamicSecrets.length;
          adjustedOffset = 0;
        } else {
          adjustedOffset = Math.max(0, adjustedOffset - totalDynamicSecretCount);
        }
      }

      console.log("adjusted", remainingLimit, adjustedOffset);

      if (includeSecrets) {
        totalSecretCount = await server.services.secret.getSecretsRawCount({
          actorId: req.permission.id,
          actor: req.permission.type,
          actorOrgId: req.permission.orgId,
          environment,
          actorAuthMethod: req.permission.authMethod,
          projectId,
          path: secretPath,
          search
          // includeImports: req.query.include_imports,
          // recursive: req.query.recursive,
          // tagSlugs: req.query.tagSlugs
        });

        if (remainingLimit > 0 && totalSecretCount > adjustedOffset) {
          const secretsRaw = await server.services.secret.getSecretsRaw({
            actorId: req.permission.id,
            actor: req.permission.type,
            actorOrgId: req.permission.orgId,
            environment,
            actorAuthMethod: req.permission.authMethod,
            projectId,
            path: secretPath,
            orderBy,
            orderDirection,
            search,
            ...(enablePagination && {
              limit: remainingLimit,
              offset: adjustedOffset
            })
            // includeImports: req.query.include_imports,
            // recursive: req.query.recursive,
            // tagSlugs: req.query.tagSlugs
          });

          secrets = secretsRaw.secrets;

          await server.services.auditLog.createAuditLog({
            projectId,
            ...req.auditLogInfo,
            event: {
              type: EventType.GET_SECRETS,
              metadata: {
                environment,
                secretPath: req.query.secretPath,
                numberOfSecrets: secrets.length
              }
            }
          });

          if (getUserAgentType(req.headers["user-agent"]) !== UserAgentType.K8_OPERATOR) {
            await server.services.telemetry.sendPostHogEvents({
              event: PostHogEventTypes.SecretPulled,
              distinctId: getTelemetryDistinctId(req),
              properties: {
                numberOfSecrets: secrets.length,
                workspaceId: projectId,
                environment,
                secretPath: req.query.secretPath,
                channel: getUserAgentType(req.headers["user-agent"]),
                ...req.auditLogInfo
              }
            });
          }
        }
      }

      return {
        imports,
        folders,
        dynamicSecrets,
        secrets,
        totalImportCount,
        totalFolderCount,
        totalDynamicSecretCount,
        totalSecretCount,
        totalCount: totalImportCount + totalFolderCount + totalDynamicSecretCount + totalSecretCount
      };
    }
  });
};
