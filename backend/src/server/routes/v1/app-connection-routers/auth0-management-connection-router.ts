import { AppConnection } from "@app/services/app-connection/app-connection-enums";
import {
  CreateAuth0ManagementConnectionSchema,
  SanitizedAuth0ManagementConnectionSchema,
  UpdateAuth0ManagementConnectionSchema
} from "@app/services/app-connection/auth0-management";

import { registerAppConnectionEndpoints } from "./app-connection-endpoints";

export const registerAuth0ManagementConnectionRouter = async (server: FastifyZodProvider) => {
  registerAppConnectionEndpoints({
    app: AppConnection.Auth0Management,
    server,
    sanitizedResponseSchema: SanitizedAuth0ManagementConnectionSchema,
    createSchema: CreateAuth0ManagementConnectionSchema,
    updateSchema: UpdateAuth0ManagementConnectionSchema
  });
};
