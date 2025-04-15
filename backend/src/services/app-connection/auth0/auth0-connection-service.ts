import { request } from "@app/lib/config/request";
import { logger } from "@app/lib/logger";
import { OrgServiceActor } from "@app/lib/types";
import { blockLocalAndPrivateIpAddresses } from "@app/lib/validator";
import { TAppConnectionDALFactory } from "@app/services/app-connection/app-connection-dal";
import { AppConnection } from "@app/services/app-connection/app-connection-enums";
import { getAuth0ConnectionAccessToken } from "@app/services/app-connection/auth0/auth0-connection-fns";
import { TKmsServiceFactory } from "@app/services/kms/kms-service";

import { TAuth0Connection, TAuth0ListClientsResponse } from "./auth0-connection-types";

type TGetAppConnectionFunc = (
  app: AppConnection,
  connectionId: string,
  actor: OrgServiceActor
) => Promise<TAuth0Connection>;

const listAuth0Clients = async (
  appConnection: TAuth0Connection,
  appConnectionDAL: Pick<TAppConnectionDALFactory, "updateById">,
  kmsService: Pick<TKmsServiceFactory, "createCipherPairWithDataKey">
) => {
  const accessToken = await getAuth0ConnectionAccessToken(appConnection, appConnectionDAL, kmsService);

  const { audience } = appConnection.credentials;
  await blockLocalAndPrivateIpAddresses(audience);

  const { data } = await request.get<TAuth0ListClientsResponse>(`${audience}clients`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Accept-Encoding": "application/json"
    }
  });

  logger.warn(data, "clients");

  return data ?? [];
};

export const auth0ConnectionService = (
  getAppConnection: TGetAppConnectionFunc,
  appConnectionDAL: Pick<TAppConnectionDALFactory, "updateById">,
  kmsService: Pick<TKmsServiceFactory, "createCipherPairWithDataKey">
) => {
  const listClients = async (connectionId: string, actor: OrgServiceActor) => {
    const appConnection = await getAppConnection(AppConnection.Auth0, connectionId, actor);

    const clients = await listAuth0Clients(appConnection, appConnectionDAL, kmsService);

    return clients;
  };

  return {
    listClients
  };
};
