import { z } from "zod";

import { ConsumerKeysSchema } from "@app/db/schemas";
import { EventType } from "@app/ee/services/audit-log/audit-log-types";
import { readLimit } from "@app/server/config/rateLimiter";
import { verifyAuth } from "@app/server/plugins/auth/verify-auth";
import { AuthMode } from "@app/services/auth/auth-type";

export const registerConsumerKeyRouter = async (server: FastifyZodProvider) => {
  server.route({
    method: "GET",
    url: "/:orgId",
    config: {
      rateLimit: readLimit
    },
    schema: {
      params: z.object({
        orgId: z.string().trim()
      }),
      response: {
        200: ConsumerKeysSchema.merge(
          z.object({
            sender: z.object({
              publicKey: z.string()
            })
          })
        )
      }
    },
    onRequest: verifyAuth([AuthMode.JWT, AuthMode.API_KEY]),
    handler: async (req) => {
      const consumerKey = await server.services.consumerKey.getLatestConsumerKey({
        actorId: req.permission.id,
        actor: req.permission.type,
        actorAuthMethod: req.permission.authMethod,
        actorOrgId: req.permission.orgId,
        orgId: req.params.orgId
      });

      await server.services.auditLog.createAuditLog({
        ...req.auditLogInfo,
        orgId: req.params.orgId,
        event: {
          type: EventType.GET_CONSUMER_KEY,
          metadata: {
            keyId: consumerKey?.id as string
          }
        }
      });

      return consumerKey;
    }
  });
};
