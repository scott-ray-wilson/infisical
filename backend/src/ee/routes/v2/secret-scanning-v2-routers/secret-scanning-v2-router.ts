import { z } from "zod";

import { GitHubSecretScanningSourceListItemSchema } from "@app/ee/services/secret-scanning-v2/github";
import { GitLabSecretScanningSourceListItemSchema } from "@app/ee/services/secret-scanning-v2/gitlab";
import { ApiDocsTags } from "@app/lib/api-docs";
import { readLimit } from "@app/server/config/rateLimiter";
import { verifyAuth } from "@app/server/plugins/auth/verify-auth";
import { AuthMode } from "@app/services/auth/auth-type";

const SecretScanningSourceOptionsSchema = z.discriminatedUnion("type", [
  GitHubSecretScanningSourceListItemSchema,
  GitLabSecretScanningSourceListItemSchema
]);

export const registerSecretScanningV2Router = async (server: FastifyZodProvider) => {
  server.route({
    method: "GET",
    url: "/secret-scanning/sources/options",
    config: {
      rateLimit: readLimit
    },
    schema: {
      hide: false,
      tags: [ApiDocsTags.SecretScanning],
      description: "List the available Secret Scanning Source Options.",
      response: {
        200: z.object({
          sourceOptions: SecretScanningSourceOptionsSchema.array()
        })
      }
    },
    onRequest: verifyAuth([AuthMode.JWT, AuthMode.IDENTITY_ACCESS_TOKEN]),
    handler: () => {
      const sourceOptions = server.services.secretScanningV2.listSecretScanningSourceOptions();
      return { sourceOptions };
    }
  });

  // server.route({
  //   method: "GET",
  //   url: "/",
  //   config: {
  //     rateLimit: readLimit
  //   },
  //   schema: {
  //     hide: false,
  //     tags: [ApiDocsTags.SecretRotations],
  //     description: "List all the Secret Rotations for the specified project.",
  //     querystring: z.object({
  //       projectId: z.string().trim().min(1, "Project ID required").describe(SecretRotations.LIST().projectId)
  //     }),
  //     response: {
  //       200: z.object({ secretRotations: SecretRotationV2Schema.array() })
  //     }
  //   },
  //   onRequest: verifyAuth([AuthMode.JWT, AuthMode.IDENTITY_ACCESS_TOKEN]),
  //   handler: async (req) => {
  //     const {
  //       query: { projectId },
  //       permission
  //     } = req;
  //
  //     const secretRotations = await server.services.secretRotationV2.listSecretRotationsByProjectId(
  //       { projectId },
  //       permission
  //     );
  //
  //     await server.services.auditLog.createAuditLog({
  //       ...req.auditLogInfo,
  //       projectId,
  //       event: {
  //         type: EventType.GET_SECRET_ROTATIONS,
  //         metadata: {
  //           rotationIds: secretRotations.map((sync) => sync.id),
  //           count: secretRotations.length
  //         }
  //       }
  //     });
  //
  //     return { secretRotations };
  //   }
  // });
};
