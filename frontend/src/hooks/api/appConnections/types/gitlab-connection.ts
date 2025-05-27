import { AppConnection } from "@app/hooks/api/appConnections/enums";
import { TRootAppConnection } from "@app/hooks/api/appConnections/types/root-connection";

export enum GitLabConnectionMethod {
  ProjectAccessToken = "project-access-token",
  GroupAccessToken = "group-access-token"
}

export type TGitLabConnection = TRootAppConnection & { app: AppConnection.GitLab } & {
  method: GitLabConnectionMethod;
  credentials: {
    accessToken: string;
    instanceUrl?: string;
  };
};
