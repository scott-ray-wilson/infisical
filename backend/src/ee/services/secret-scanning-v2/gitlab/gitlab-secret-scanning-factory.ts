import { join } from "path";

import { SecretScanningResource } from "@app/ee/services/secret-scanning-v2/secret-scanning-v2-enums";
import { cloneRepository } from "@app/ee/services/secret-scanning-v2/secret-scanning-v2-fns";
import {
  TSecretScanningFactoryGetFullScanPath,
  TSecretScanningFactoryInitialize,
  TSecretScanningFactoryListRawResources,
  TSecretScanningFactoryParams,
  TSecretScanningFactoryPostInitialization
} from "@app/ee/services/secret-scanning-v2/secret-scanning-v2-types";
import {
  getGitLabConnectionClient,
  getGitLabConnectionUrl,
  listGitLabProjects,
  TGitLabConnection
} from "@app/services/app-connection/gitlab";

import {
  TGitLabDataSourceCredentials,
  TGitLabDataSourceInput,
  TGitLabDataSourceWithConnection
} from "./gitlab-secret-scanning-types";

const getMainDomain = (instanceUrl: string) => {
  const url = new URL(instanceUrl);
  const { hostname } = url;
  const parts = hostname.split(".");

  if (parts.length >= 2) {
    return parts.slice(-2).join(".");
  }

  return hostname;
};

export const GitLabSecretScanningFactory = ({ appConnectionDAL, kmsService }: TSecretScanningFactoryParams) => {
  const initialize: TSecretScanningFactoryInitialize<
    TGitLabDataSourceInput,
    TGitLabConnection,
    TGitLabDataSourceCredentials
  > = async ({ connection }, callback) => {
    return callback({});
    // const client = await getGitLabClient(connection);
    // const appCfg = getConfig();
    //
    // const { method } = connection;
    //
    // const token = generatePassword();
    //
    // switch (method) {
    //   case GitLabConnectionMethod.ProjectAccessToken: {
    //     const [project] = await listGitLabConnectionProjects(connection);
    //
    //     if (!project) {
    //       throw new BadRequestError({ message: "Could not find project associated with access token" });
    //     }
    //
    //     const hook = await client.ProjectHooks.add(
    //       project.id,
    //       `${appCfg.SITE_URL}${SECRET_SCANNING_WEBHOOK_PATH}/gitlab`,
    //       {
    //         token,
    //         pushEvents: true,
    //         enableSslVerification: true,
    //         // @ts-expect-error gitbeaker is outdated, and the types don't support this field yet
    //         name: "Infisical Secret Scanning"
    //       }
    //     );
    //
    //     try {
    //       return await callback({
    //         credentials: {
    //           token,
    //           hookId: hook.id,
    //           projectId: project.id,
    //           method: GitLabConnectionMethod.ProjectAccessToken
    //         }
    //       });
    //     } catch (error) {
    //       try {
    //         await client.ProjectHooks.remove(project.id, hook.id);
    //       } catch {
    //         // do nothing, just try to clean up webhook
    //       }
    //
    //       throw error;
    //     }
    //
    //     break;
    //   }
    //   // case GitLabConnectionMethod.GroupAccessToken: {
    //   //   // TODO
    //   //   return callback({ token });
    //   //
    //   //   break;
    //   // }
    //   default:
    //     throw new InternalServerError({
    //       message: `Unhandled GitLab Connection Method: ${method as GitLabConnectionMethod}`
    //     });
    // }
  };

  const postInitialization: TSecretScanningFactoryPostInitialization<
    TGitLabDataSourceInput,
    TGitLabConnection,
    TGitLabDataSourceCredentials
  > = async ({ connection, dataSourceId, credentials }) => {
    // const client = await getGitLabConnectionClient(connection);
    // const appCfg = getConfig();
    //
    // const { method } = connection;
    //
    // switch (method) {
    //   case GitLabConnectionMethod.ProjectAccessToken: {
    //     const { hookId, projectId } = credentials;
    //
    //     try {
    //       await client.ProjectHooks.edit(
    //         projectId,
    //         hookId,
    //         `${appCfg.SITE_URL}${SECRET_SCANNING_WEBHOOK_PATH}/gitlab`,
    //         {
    //           // @ts-expect-error gitbeaker is outdated, and the types don't support this field yet
    //
    //           custom_headers: [{ key: "x-data-source-id", value: dataSourceId }]
    //         }
    //       );
    //     } catch (error) {
    //       try {
    //         await client.ProjectHooks.remove(projectId, hookId);
    //       } catch {
    //         // do nothing, just try to clean up webhook
    //       }
    //
    //       throw error;
    //     }
    //
    //     break;
    //   }
    //   case GitLabConnectionMethod.GroupAccessToken: {
    //     break;
    //   }
    //   default:
    //     throw new InternalServerError({
    //       message: `Unhandled GitLab Connection Method: ${method as GitLabConnectionMethod}`
    //     });
    // }
  };

  const listRawResources: TSecretScanningFactoryListRawResources<TGitLabDataSourceWithConnection> = async (
    dataSource
  ) => {
    const {
      connection,
      config: { includeProjects }
    } = dataSource;

    const projects = await listGitLabProjects({ appConnection: connection, appConnectionDAL, kmsService });

    const filteredProjects: typeof projects = [];
    if (!includeProjects || includeProjects.includes("*")) {
      filteredProjects.push(...projects);
    } else {
      filteredProjects.push(...projects.filter((project) => includeProjects.includes(project.name)));
    }

    return filteredProjects.map(({ id, name }) => ({
      name,
      externalId: id.toString(),
      type: SecretScanningResource.Project
    }));
  };

  const getScanPath: TSecretScanningFactoryGetFullScanPath<TGitLabDataSourceWithConnection> = async ({
    dataSource,
    resourceName,
    tempFolder
  }) => {
    const { connection } = dataSource;

    const instanceUrl = await getGitLabConnectionUrl(connection);

    const client = await getGitLabConnectionClient(connection);

    const user = await client.Users.showCurrentUser();

    const repoPath = join(tempFolder, "repo.git");

    await cloneRepository({
      // TODO: test main domain with self-hosted
      cloneUrl: `https://${user.username}:${connection.credentials.accessToken}@${getMainDomain(instanceUrl)}/${resourceName}.git`,
      repoPath
    });

    return repoPath;
  };

  return {
    listRawResources,
    getScanPath,
    initialize,
    postInitialize: postInitialization
  };
};
