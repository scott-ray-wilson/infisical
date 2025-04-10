import { AxiosError } from "axios";

import { request } from "@app/lib/config/request";
import { BadRequestError } from "@app/lib/errors";
import { removeTrailingSlash } from "@app/lib/fn";
import { logger } from "@app/lib/logger";
import { blockLocalAndPrivateIpAddresses } from "@app/lib/validator";
import { AppConnection } from "@app/services/app-connection/app-connection-enums";

import { Auth0ConnectionMethod } from "./auth0-connection-enums";
import { TAuth0ConnectionConfig } from "./auth0-connection-types";

export const getAuth0ConnectionListItem = () => {
  return {
    name: "Auth0" as const,
    app: AppConnection.Auth0 as const,
    methods: Object.values(Auth0ConnectionMethod) as [Auth0ConnectionMethod.ClientCredentials]
  };
};

export const validateAuth0ConnectionCredentials = async ({ credentials }: TAuth0ConnectionConfig) => {
  const { instanceUrl, clientSecret, clientId } = credentials;

  await blockLocalAndPrivateIpAddresses(instanceUrl);

  try {
    logger.warn(`${removeTrailingSlash(instanceUrl)}/oauth/token`);
    const resp = await request.request({
      method: "POST",
      url: `${removeTrailingSlash(instanceUrl)}/oauth/token`,
      headers: { "content-type": "application/x-www-form-urlencoded" },
      data: new URLSearchParams({
        grant_type: "client_credentials",
        client_id: clientId,
        client_secret: clientSecret,
        audience: `${removeTrailingSlash(instanceUrl)}/api/v2/`
      })
    });

    return credentials;
  } catch (e: unknown) {
    throw new BadRequestError({
      message: (e as AxiosError).message ?? `Unable to validate connection: verify credentials`
    });
  }
};
