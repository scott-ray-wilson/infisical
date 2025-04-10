import { z } from "zod";

import { AppConnections } from "@app/lib/api-docs";
import { AppConnection } from "@app/services/app-connection/app-connection-enums";
import {
  BaseAppConnectionSchema,
  GenericCreateAppConnectionFieldsSchema,
  GenericUpdateAppConnectionFieldsSchema
} from "@app/services/app-connection/app-connection-schemas";

import { Auth0ConnectionMethod } from "./auth0-management-connection-enums";

export const Auth0ManagementConnectionApiTokenCredentialsSchema = z.object({
  managementUrl: z
    .string()
    .trim()
    .min(1, "Auth0 Management Url required")
    .describe(AppConnections.CREDENTIALS.AUTH0_MANAGEMENT.managementUrl),
  token: z.string().trim().min(1, "API Token required").describe(AppConnections.CREDENTIALS.AUTH0_MANAGEMENT.token)
});

const BaseAuth0ManagementConnectionSchema = BaseAppConnectionSchema.extend({
  app: z.literal(AppConnection.Auth0Management)
});

export const Auth0ManagementConnectionSchema = z.intersection(
  BaseAuth0ManagementConnectionSchema,
  z.discriminatedUnion("method", [
    z.object({
      method: z.literal(Auth0ConnectionMethod.ApiToken),
      credentials: Auth0ManagementConnectionApiTokenCredentialsSchema
    })
  ])
);

export const SanitizedAuth0ManagementConnectionSchema = z.discriminatedUnion("method", [
  BaseAuth0ManagementConnectionSchema.extend({
    method: z.literal(Auth0ConnectionMethod.ApiToken),
    credentials: Auth0ManagementConnectionApiTokenCredentialsSchema.pick({
      managementUrl: true
    })
  })
]);

export const ValidateAuth0ManagementConnectionCredentialsSchema = z.discriminatedUnion("method", [
  z.object({
    method: z
      .literal(Auth0ConnectionMethod.ApiToken)
      .describe(AppConnections.CREATE(AppConnection.Auth0Management).method),
    credentials: Auth0ManagementConnectionApiTokenCredentialsSchema.describe(
      AppConnections.CREATE(AppConnection.Auth0Management).credentials
    )
  })
]);

export const CreateAuth0ManagementConnectionSchema = ValidateAuth0ManagementConnectionCredentialsSchema.and(
  GenericCreateAppConnectionFieldsSchema(AppConnection.Auth0Management)
);

export const UpdateAuth0ManagementConnectionSchema = z
  .object({
    credentials: Auth0ManagementConnectionApiTokenCredentialsSchema.optional().describe(
      AppConnections.UPDATE(AppConnection.Auth0Management).credentials
    )
  })
  .and(GenericUpdateAppConnectionFieldsSchema(AppConnection.Auth0Management));

export const Auth0ManagementConnectionListItemSchema = z.object({
  name: z.literal("Auth0 Management"),
  app: z.literal(AppConnection.Auth0Management),
  // the below is preferable but currently breaks with our zod to json schema parser
  // methods: z.tuple([z.literal(AwsConnectionMethod.ServicePrincipal), z.literal(AwsConnectionMethod.AccessKey)]),
  methods: z.nativeEnum(Auth0ConnectionMethod).array()
});
