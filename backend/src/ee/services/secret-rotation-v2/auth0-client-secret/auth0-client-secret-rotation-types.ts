import { z } from "zod";

import {
  Auth0ClientSecretRotationGeneratedCredentialsSchema,
  Auth0ClientSecretRotationListItemSchema,
  Auth0ClientSecretRotationSchema,
  CreateAuth0ClientSecretRotationSchema
} from "./auth0-client-secret-rotation-schemas";

export type TAuth0ClientSecretRotation = z.infer<typeof Auth0ClientSecretRotationSchema>;

export type TAuth0ClientSecretRotationInput = z.infer<typeof CreateAuth0ClientSecretRotationSchema>;

export type TAuth0ClientSecretRotationListItem = z.infer<typeof Auth0ClientSecretRotationListItemSchema>;

export type TAuth0ClientSecretRotationWithConnection = TAuth0ClientSecretRotation & {
  connection: TAuth0ClientSecretRotation;
};

export type TAuth0ClientSecretRotationGeneratedCredentials = z.infer<
  typeof Auth0ClientSecretRotationGeneratedCredentialsSchema
>;
