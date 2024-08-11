import { z } from "zod";

import { ConsumerSecretsSchema, ConsumerSecretType } from "@app/db/schemas";
import { EventType } from "@app/ee/services/audit-log/audit-log-types";
import { secretsLimit } from "@app/server/config/rateLimiter";
import { getTelemetryDistinctId } from "@app/server/lib/telemetry";
import { getUserAgentType } from "@app/server/plugins/audit-log";
import { verifyAuth } from "@app/server/plugins/auth/verify-auth";
import { AuthMode } from "@app/services/auth/auth-type";
import { PostHogEventTypes } from "@app/services/telemetry/telemetry-types";

export const registerConsumerSecretRouter = async (server: FastifyZodProvider) => {
  server.route({
    url: "/:secretName",
    method: "POST",
    config: {
      rateLimit: secretsLimit
    },
    schema: {
      body: z.object({
        type: z.nativeEnum(ConsumerSecretType),
        secretNameCiphertext: z.string().trim(),
        secretNameIV: z.string().trim(),
        secretNameTag: z.string().trim(),
        secretFieldOneCiphertext: z.string().trim(),
        secretFieldOneIV: z.string().trim(),
        secretFieldOneTag: z.string().trim(),
        secretFieldTwoCiphertext: z.string().trim(),
        secretFieldTwoIV: z.string().trim(),
        secretFieldTwoTag: z.string().trim(),
        secretFieldThreeCiphertext: z.string().trim(),
        secretFieldThreeIV: z.string().trim(),
        secretFieldThreeTag: z.string().trim(),
        secretFieldFourCiphertext: z.string().trim(),
        secretFieldFourIV: z.string().trim(),
        secretFieldFourTag: z.string().trim(),
        metadata: z.record(z.string()).optional(),
        orgId: z.string().trim(),
        skipMultilineEncoding: z.boolean().optional()
      }),
      params: z.object({
        secretName: z.string().trim()
      }),
      response: {
        200: z.object({
          consumerSecret: ConsumerSecretsSchema
        })
      }
    },
    onRequest: verifyAuth([AuthMode.JWT, AuthMode.API_KEY, AuthMode.SERVICE_TOKEN, AuthMode.IDENTITY_ACCESS_TOKEN]),
    handler: async (req) => {
      const { type, orgId } = req.body;

      const consumerSecret = await server.services.consumerSecret.createConsumerSecret({
        actorId: req.permission.id,
        actor: req.permission.type,
        actorAuthMethod: req.permission.authMethod,
        actorOrgId: req.permission.orgId,
        secretName: req.params.secretName,
        ...req.body
      });

      await server.services.auditLog.createAuditLog({
        ...req.auditLogInfo,
        orgId,
        event: {
          type: EventType.CREATE_CONSUMER_SECRET,
          metadata: {
            userId: req.permission.id,
            secretType: type,
            secretId: consumerSecret.id,
            secretName: req.params.secretName
          }
        }
      });

      await server.services.telemetry.sendPostHogEvents({
        event: PostHogEventTypes.ConsumerSecretCreated,
        distinctId: getTelemetryDistinctId(req),
        properties: {
          numberOfSecrets: 1,
          secretType: type,
          userId: req.permission.id,
          orgId,
          channel: getUserAgentType(req.headers["user-agent"]),
          ...req.auditLogInfo
        }
      });

      return { consumerSecret };
    }
  });

  server.route({
    url: "/:orgId",
    method: "GET",
    config: {
      rateLimit: secretsLimit
    },
    schema: {
      params: z.object({
        orgId: z.string().trim().uuid()
      }),
      response: {
        200: z.object({
          consumerSecrets: ConsumerSecretsSchema.array()
        })
      }
    },
    onRequest: verifyAuth([AuthMode.JWT, AuthMode.API_KEY, AuthMode.SERVICE_TOKEN, AuthMode.IDENTITY_ACCESS_TOKEN]),
    handler: async (req) => {
      const { orgId } = req.params;

      const consumerSecrets = await server.services.consumerSecret.getConsumerSecrets({
        actorId: req.permission.id,
        actor: req.permission.type,
        actorAuthMethod: req.permission.authMethod,
        actorOrgId: req.permission.orgId,
        orgId
      });

      await server.services.auditLog.createAuditLog({
        ...req.auditLogInfo,
        orgId,
        event: {
          type: EventType.GET_CONSUMER_SECRETS,
          metadata: {
            numberOfSecrets: consumerSecrets.length,
            userId: req.permission.id
          }
        }
      });

      await server.services.telemetry.sendPostHogEvents({
        event: PostHogEventTypes.ConsumerSecretPulled,
        distinctId: getTelemetryDistinctId(req),
        properties: {
          numberOfSecrets: consumerSecrets.length,
          userId: req.permission.id,
          orgId,
          channel: getUserAgentType(req.headers["user-agent"]),
          ...req.auditLogInfo
        }
      });

      return { consumerSecrets };
    }
  });

  server.route({
    method: "DELETE",
    url: "/:secretId", // TODO: use secretName once blind index implemented
    config: {
      rateLimit: secretsLimit
    },
    schema: {
      params: z.object({
        secretId: z.string()
      }),
      body: z.object({
        orgId: z.string().trim().uuid()
      }),
      response: {
        200: z.object({
          deletedConsumerSecret: ConsumerSecretsSchema
        })
      }
    },
    onRequest: verifyAuth([AuthMode.JWT, AuthMode.API_KEY, AuthMode.SERVICE_TOKEN, AuthMode.IDENTITY_ACCESS_TOKEN]),
    handler: async (req) => {
      const { orgId } = req.body;

      const [deletedConsumerSecret] = await server.services.consumerSecret.deleteConsumerSecret({
        actorId: req.permission.id,
        actor: req.permission.type,
        actorAuthMethod: req.permission.authMethod,
        actorOrgId: req.permission.orgId,
        orgId,
        consumerSecretId: req.params.secretId
      });

      await server.services.auditLog.createAuditLog({
        ...req.auditLogInfo,
        orgId,
        event: {
          type: EventType.DELETE_CONSUMER_SECRET,
          metadata: {
            secretId: deletedConsumerSecret.id,
            userId: req.permission.id
          }
        }
      });

      await server.services.telemetry.sendPostHogEvents({
        event: PostHogEventTypes.ConsumerSecretDeleted,
        distinctId: getTelemetryDistinctId(req),
        properties: {
          numberOfSecrets: 1,
          userId: req.permission.id,
          orgId,
          channel: getUserAgentType(req.headers["user-agent"]),
          ...req.auditLogInfo
        }
      });

      return { deletedConsumerSecret };
    }
  });

  server.route({
    method: "PATCH",
    url: "/:secretId", // TODO: use secretName once blind index implemented
    config: {
      rateLimit: secretsLimit
    },
    schema: {
      params: z.object({
        secretId: z.string()
      }),
      body: z.object({
        secretNameCiphertext: z.string().trim(),
        secretNameIV: z.string().trim(),
        secretNameTag: z.string().trim(),
        secretFieldOneCiphertext: z.string().trim(),
        secretFieldOneIV: z.string().trim(),
        secretFieldOneTag: z.string().trim(),
        secretFieldTwoCiphertext: z.string().trim(),
        secretFieldTwoIV: z.string().trim(),
        secretFieldTwoTag: z.string().trim(),
        secretFieldThreeCiphertext: z.string().trim(),
        secretFieldThreeIV: z.string().trim(),
        secretFieldThreeTag: z.string().trim(),
        secretFieldFourCiphertext: z.string().trim(),
        secretFieldFourIV: z.string().trim(),
        secretFieldFourTag: z.string().trim(),
        metadata: z.record(z.string()).optional(),
        orgId: z.string().trim(),
        skipMultilineEncoding: z.boolean().optional()
      }),
      response: {
        200: z.object({
          updatedConsumerSecret: ConsumerSecretsSchema
        })
      }
    },
    onRequest: verifyAuth([AuthMode.JWT, AuthMode.API_KEY, AuthMode.SERVICE_TOKEN, AuthMode.IDENTITY_ACCESS_TOKEN]),
    handler: async (req) => {
      const { orgId, ...input } = req.body;

      const [updatedConsumerSecret] = await server.services.consumerSecret.updateConsumerSecret({
        actorId: req.permission.id,
        actor: req.permission.type,
        actorAuthMethod: req.permission.authMethod,
        actorOrgId: req.permission.orgId,
        orgId,
        consumerSecretId: req.params.secretId,
        ...input
      });

      await server.services.auditLog.createAuditLog({
        ...req.auditLogInfo,
        orgId,
        event: {
          type: EventType.UPDATE_CONSUMER_SECRET,
          metadata: {
            secretId: updatedConsumerSecret.id,
            userId: req.permission.id
          }
        }
      });

      await server.services.telemetry.sendPostHogEvents({
        event: PostHogEventTypes.ConsumerSecretUpdated,
        distinctId: getTelemetryDistinctId(req),
        properties: {
          numberOfSecrets: 1,
          userId: req.permission.id,
          orgId,
          channel: getUserAgentType(req.headers["user-agent"]),
          ...req.auditLogInfo
        }
      });

      return { updatedConsumerSecret };
    }
  });
};
