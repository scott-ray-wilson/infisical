import { logger } from "@app/lib/logger";
import { OrgServiceActor } from "@app/lib/types";
import { listWindmillWorkspaces } from "@app/services/app-connection/windmill/windmill-connection-fns";

import { AppConnection } from "../app-connection-enums";
import { TWindmillConnection } from "./windmill-connection-types";

type TGetAppConnectionFunc = (
  app: AppConnection,
  connectionId: string,
  actor: OrgServiceActor
) => Promise<TWindmillConnection>;

export const windmillConnectionService = (getAppConnection: TGetAppConnectionFunc) => {
  const listWorkspaces = async (connectionId: string, actor: OrgServiceActor) => {
    const appConnection = await getAppConnection(AppConnection.Windmill, connectionId, actor);

    try {
      const workspaces = await listWindmillWorkspaces(appConnection);
      logger.warn(workspaces, "Windmill workspaces");
      return workspaces;
    } catch (error) {
      logger.error(error, "Failed to list Windmill workspaces");
      return [];
    }
  };

  return {
    listWorkspaces
  };
};
