import { AppConnection } from "@app/services/app-connection/app-connection-enums";
import {
  CreateWindmillConnectionSchema,
  SanitizedWindmillConnectionSchema,
  UpdateWindmillConnectionSchema
} from "@app/services/app-connection/windmill";

import { registerAppConnectionEndpoints } from "./app-connection-endpoints";

export const registerWindmillConnectionRouter = async (server: FastifyZodProvider) => {
  registerAppConnectionEndpoints({
    app: AppConnection.Windmill,
    server,
    sanitizedResponseSchema: SanitizedWindmillConnectionSchema,
    createSchema: CreateWindmillConnectionSchema,
    updateSchema: UpdateWindmillConnectionSchema
  });

  // The below endpoints are not exposed and for Infisical App use
  // server.route({
  //   method: "GET",
  //   url: `/:connectionId/organizations`,
  //   config: {
  //     rateLimit: readLimit
  //   },
  //   schema: {
  //     params: z.object({
  //       connectionId: z.string().uuid()
  //     }),
  //     response: {
  //       200: z
  //         .object({
  //           id: z.string(),
  //           name: z.string(),
  //           apps: z
  //             .object({
  //               id: z.string(),
  //               name: z.string(),
  //               envs: z
  //                 .object({
  //                   id: z.string(),
  //                   name: z.string()
  //                 })
  //                 .array()
  //             })
  //             .array()
  //         })
  //         .array()
  //     }
  //   },
  //   onRequest: verifyAuth([AuthMode.JWT]),
  //   handler: async (req) => {
  //     const { connectionId } = req.params;
  //
  //     const organizations: WindmillOrgWithApps[] = await server.services.appConnection.humanitec.listOrganizations(
  //       connectionId,
  //       req.permission
  //     );
  //
  //     return organizations;
  //   }
  // });
};
