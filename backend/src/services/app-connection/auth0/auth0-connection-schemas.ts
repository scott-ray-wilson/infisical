import { z } from "zod";

import { AppConnections } from "@app/lib/api-docs";
import { AppConnection } from "@app/services/app-connection/app-connection-enums";
import {
  BaseAppConnectionSchema,
  GenericCreateAppConnectionFieldsSchema,
  GenericUpdateAppConnectionFieldsSchema
} from "@app/services/app-connection/app-connection-schemas";

import { Auth0ConnectionMethod } from "./auth0-connection-enums";

export const Auth0ConnectionApiTokenCredentialsSchema = z.object({
  instanceUrl: z
    .string()
    .trim()
    .url()
    .min(1, "Auth0 Url required")
    .describe(AppConnections.CREDENTIALS.AUTH0_MANAGEMENT.instanceUrl),
  clientId: z
    .string()
    .trim()
    .min(1, "Client ID required")
    .describe(AppConnections.CREDENTIALS.AUTH0_MANAGEMENT.clientId),
  clientSecret: z
    .string()
    .trim()
    .min(1, "Client Secret required")
    .describe(AppConnections.CREDENTIALS.AUTH0_MANAGEMENT.clientSecret)
});

const BaseAuth0ConnectionSchema = BaseAppConnectionSchema.extend({
  app: z.literal(AppConnection.Auth0)
});

export const Auth0ConnectionSchema = z.intersection(
  BaseAuth0ConnectionSchema,
  z.discriminatedUnion("method", [
    z.object({
      method: z.literal(Auth0ConnectionMethod.ClientCredentials),
      credentials: Auth0ConnectionApiTokenCredentialsSchema
    })
  ])
);

export const SanitizedAuth0ConnectionSchema = z.discriminatedUnion("method", [
  BaseAuth0ConnectionSchema.extend({
    method: z.literal(Auth0ConnectionMethod.ClientCredentials),
    credentials: Auth0ConnectionApiTokenCredentialsSchema.pick({
      instanceUrl: true,
      clientId: true
    })
  })
]);

export const ValidateAuth0ConnectionCredentialsSchema = z.discriminatedUnion("method", [
  z.object({
    method: z
      .literal(Auth0ConnectionMethod.ClientCredentials)
      .describe(AppConnections.CREATE(AppConnection.Auth0).method),
    credentials: Auth0ConnectionApiTokenCredentialsSchema.describe(
      AppConnections.CREATE(AppConnection.Auth0).credentials
    )
  })
]);

export const CreateAuth0ConnectionSchema = ValidateAuth0ConnectionCredentialsSchema.and(
  GenericCreateAppConnectionFieldsSchema(AppConnection.Auth0)
);

export const UpdateAuth0ConnectionSchema = z
  .object({
    credentials: Auth0ConnectionApiTokenCredentialsSchema.optional().describe(
      AppConnections.UPDATE(AppConnection.Auth0).credentials
    )
  })
  .and(GenericUpdateAppConnectionFieldsSchema(AppConnection.Auth0));

export const Auth0ConnectionListItemSchema = z.object({
  name: z.literal("Auth0"),
  app: z.literal(AppConnection.Auth0),
  // the below is preferable but currently breaks with our zod to json schema parser
  // methods: z.tuple([z.literal(AwsConnectionMethod.ServicePrincipal), z.literal(AwsConnectionMethod.AccessKey)]),
  methods: z.nativeEnum(Auth0ConnectionMethod).array()
});
