import { AxiosError } from "axios";

import { request } from "@app/lib/config/request";
import { BadRequestError } from "@app/lib/errors";
import { removeTrailingSlash } from "@app/lib/fn";
import { logger } from "@app/lib/logger";
import { AppConnection } from "@app/services/app-connection/app-connection-enums";

import { Auth0ConnectionMethod } from "./auth0-management-connection-enums";
import { TAuth0ManagementConnectionConfig } from "./auth0-management-connection-types";

export const getAuth0ManagementConnectionListItem = () => {
  return {
    name: "Auth0 Management" as const,
    app: AppConnection.Auth0Management as const,
    methods: Object.values(Auth0ConnectionMethod) as [Auth0ConnectionMethod.ApiToken]
  };
};

export const validateAuth0ManagementConnectionCredentials = async ({
  credentials
}: TAuth0ManagementConnectionConfig) => {
  const { managementUrl, token } = credentials;

  try {
    const resp = await request.get(
      // in case they copy the full identifier we strip the api/version
      `${removeTrailingSlash(managementUrl).split("/api/")[0]}/api/v2`,
      {
        headers: { authorization: `Bearer ${token}` }
      }
    );

    logger.warn(resp, "VERIFY RESPONSE");
    return credentials;
  } catch (e: unknown) {
    throw new BadRequestError({
      message: (e as AxiosError).message ?? `Unable to validate connection: verify credentials`
    });
  }
};
