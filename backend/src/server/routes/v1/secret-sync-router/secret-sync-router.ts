import { z } from "zod";

import { EventType } from "@app/ee/services/audit-log/audit-log-types";
import { SecretSyncs } from "@app/lib/api-docs";
import { AppConnection } from "@app/lib/app-connections";
import { SecretSync } from "@app/lib/secret-syncs";
import { AwsParameterStoreSchema } from "@app/lib/secret-syncs/aws-parameter-store";
import { readLimit } from "@app/server/config/rateLimiter";
import { verifyAuth } from "@app/server/plugins/auth/verify-auth";
import { AuthMode } from "@app/services/auth/auth-type";

const SecretSyncSchema = z.union([AwsParameterStoreSchema]);

export const registerSecretSyncRouter = async (server: FastifyZodProvider) => {
  server.route({
    method: "GET",
    url: "/options",
    config: {
      rateLimit: readLimit
    },
    schema: {
      description: "List the available Secret Sync Options.",
      response: {
        200: z.object({
          secretSyncOptions: z
            .object({
              name: z.string(),
              slug: z.nativeEnum(SecretSync),
              app: z.nativeEnum(AppConnection)
            })
            .passthrough()
            .array()
        })
      }
    },
    onRequest: verifyAuth([AuthMode.JWT, AuthMode.SERVICE_TOKEN]),
    handler: () => {
      const secretSyncOptions = server.services.secretSync.listSecretSyncOptions();
      return { secretSyncOptions };
    }
  });

  server.route({
    method: "GET",
    url: "/",
    config: {
      rateLimit: readLimit
    },
    schema: {
      description: "List all the Secret Syncs for the specified project.",
      params: z.object({
        projectId: z.string().min(1, { message: "Project ID required" }).describe(SecretSyncs.LIST.projectId)
      }),
      response: {
        200: z.object({ secretSyncs: SecretSyncSchema.array() })
      }
    },
    onRequest: verifyAuth([AuthMode.JWT, AuthMode.SERVICE_TOKEN]),
    handler: async (req) => {
      const {
        params: { projectId },
        permission
      } = req;
      const secretSyncs = await server.services.secretSync.listSecretSyncsByProjectId({ projectId }, permission);

      await server.services.auditLog.createAuditLog({
        ...req.auditLogInfo,
        projectId,
        event: {
          type: EventType.GET_SECRET_SYNCS,
          metadata: {
            syncIds: secretSyncs.map((sync) => sync.id),
            count: secretSyncs.length
          }
        }
      });

      return { secretSyncs };
    }
  });
};
