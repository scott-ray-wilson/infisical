import { AppConnection } from "../enums";
import { TRootAppConnection } from "./root-connection";

export enum Auth0ManagementConnectionMethod {
  ApiToken = "api-tojen"
}

export type TDatabricksConnection = TRootAppConnection & { app: AppConnection.Databricks } & {
  method: DatabricksConnectionMethod.ServicePrincipal;
  credentials: {
    workspaceUrl: string;
    clientId: string;
    clientSecret: string;
  };
};
