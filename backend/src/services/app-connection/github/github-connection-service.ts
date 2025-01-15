import { OrgServiceActor } from "@app/lib/types";
import { AppConnection } from "@app/services/app-connection/app-connection-enums";
import {
  getGitHubOrganizations,
  getGitHubRepositories
} from "@app/services/app-connection/github/github-connection-fns";
import { TGitHubConnection } from "@app/services/app-connection/github/github-connection-types";

type GetAppConnectionFunc = (
  app: AppConnection,
  connectionId: string,
  actor: OrgServiceActor
) => Promise<TGitHubConnection>;

export const githubConnectionService = (getAppConnection: GetAppConnectionFunc) => {
  const listRepositories = async (connectionId: string, actor: OrgServiceActor) => {
    const appConnection = await getAppConnection(AppConnection.GitHub, connectionId, actor);

    const repositories = await getGitHubRepositories(appConnection);

    return repositories;
  };

  const listOrganizations = async (connectionId: string, actor: OrgServiceActor) => {
    const appConnection = await getAppConnection(AppConnection.GitHub, connectionId, actor);

    const organizations = await getGitHubOrganizations(appConnection);

    return organizations;
  };

  return {
    listRepositories,
    listOrganizations
  };
};
