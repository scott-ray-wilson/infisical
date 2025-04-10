import { z } from "zod";

import { DiscriminativePick } from "@app/lib/types";
import { AppConnection } from "@app/services/app-connection/app-connection-enums";

import {
  Auth0ManagementConnectionSchema,
  CreateAuth0ManagementConnectionSchema,
  ValidateAuth0ManagementConnectionCredentialsSchema
} from "./auth0-management-connection-schemas";

export type TAuth0ManagementConnection = z.infer<typeof Auth0ManagementConnectionSchema>;

export type TAuth0ManagementConnectionInput = z.infer<typeof CreateAuth0ManagementConnectionSchema> & {
  app: AppConnection.Auth0Management;
};

export type TValidateAuth0ManagementConnectionCredentialsSchema =
  typeof ValidateAuth0ManagementConnectionCredentialsSchema;

export type TAuth0ManagementConnectionConfig = DiscriminativePick<
  TAuth0ManagementConnection,
  "method" | "app" | "credentials"
> & {
  orgId: string;
};
