import { join } from "path";

import { generatePassword } from "@app/ee/services/secret-rotation-v2/shared/utils";
import { SECRET_SCANNING_WEBHOOK_PATH } from "@app/ee/services/secret-scanning-v2/github";
import { SecretScanningResource } from "@app/ee/services/secret-scanning-v2/secret-scanning-v2-enums";
import { cloneRepository } from "@app/ee/services/secret-scanning-v2/secret-scanning-v2-fns";
import {
  TSecretScanningFactoryGetScanPath,
  TSecretScanningFactoryInitialize,
  TSecretScanningFactoryListRawResources,
  TSecretScanningFactoryPostInitialize
} from "@app/ee/services/secret-scanning-v2/secret-scanning-v2-types";
import { getConfig } from "@app/lib/config/env";
import { BadRequestError, InternalServerError } from "@app/lib/errors";
import {
  getGitLabConnectionClient,
  getGitLabConnectionUrl,
  GitLabConnectionMethod,
  listGitLabConnectionProjects,
  TGitLabConnection
} from "@app/services/app-connection/gitlab";

import { TGitLabDataSourceCredentials, TGitLabDataSourceWithConnection } from "./gitlab-secret-scanning-types";

const getMainDomain = (instanceUrl: string) => {
  const url = new URL(instanceUrl);
  const { hostname } = url;
  const parts = hostname.split(".");

  if (parts.length >= 2) {
    return parts.slice(-2).join(".");
  }

  return hostname;
};

export const GitLabSecretScanningFactory = () => {
  const initialize: TSecretScanningFactoryInitialize<TGitLabConnection, TGitLabDataSourceCredentials> = async (
    { connection },
    callback
  ) => {
    const client = await getGitLabConnectionClient(connection);
    const appCfg = getConfig();

    const { method } = connection;

    const token = generatePassword();

    switch (method) {
      case GitLabConnectionMethod.ProjectAccessToken: {
        const [project] = await listGitLabConnectionProjects(connection);

        if (!project) {
          throw new BadRequestError({ message: "Could not find project associated with access token" });
        }

        const hook = await client.ProjectHooks.add(
          project.id,
          `${appCfg.SITE_URL}${SECRET_SCANNING_WEBHOOK_PATH}/gitlab`,
          {
            token,
            pushEvents: true,
            enableSslVerification: true,
            // @ts-expect-error gitbeaker is outdated, and the types don't support this field yet
            name: "Infisical Secret Scanning"
          }
        );

        try {
          return await callback({
            token,
            hookId: hook.id,
            projectId: project.id,
            method: GitLabConnectionMethod.ProjectAccessToken
          });
        } catch (error) {
          try {
            await client.ProjectHooks.remove(project.id, hook.id);
          } catch {
            // do nothing, just try to clean up webhook
          }

          throw error;
        }

        break;
      }
      case GitLabConnectionMethod.GroupAccessToken: {
        // TODO
        return callback({ token });

        break;
      }
      default:
        throw new InternalServerError({
          message: `Unhandled GitLab Connection Method: ${method as GitLabConnectionMethod}`
        });
    }
  };

  const postInitialize: TSecretScanningFactoryPostInitialize<TGitLabConnection, TGitLabDataSourceCredentials> = async ({
    connection,
    dataSourceId,
    credentials
  }) => {
    const client = await getGitLabConnectionClient(connection);
    const appCfg = getConfig();

    const { method } = connection;

    switch (method) {
      case GitLabConnectionMethod.ProjectAccessToken: {
        const { hookId, projectId } = credentials;

        try {
          await client.ProjectHooks.edit(
            projectId,
            hookId,
            `${appCfg.SITE_URL}${SECRET_SCANNING_WEBHOOK_PATH}/gitlab`,
            {
              // @ts-expect-error gitbeaker is outdated, and the types don't support this field yet

              custom_headers: [{ key: "x-data-source-id", value: dataSourceId }]
            }
          );
        } catch (error) {
          try {
            await client.ProjectHooks.remove(projectId, hookId);
          } catch {
            // do nothing, just try to clean up webhook
          }

          throw error;
        }

        break;
      }
      case GitLabConnectionMethod.GroupAccessToken: {
        break;
      }
      default:
        throw new InternalServerError({
          message: `Unhandled GitLab Connection Method: ${method as GitLabConnectionMethod}`
        });
    }
  };

  const listRawResources: TSecretScanningFactoryListRawResources<TGitLabDataSourceWithConnection> = async (
    dataSource
  ) => {
    const {
      connection,
      config: { includeProjects }
    } = dataSource;

    const projects = await listGitLabConnectionProjects(connection);

    const filteredProjects: typeof projects = [];
    if (!includeProjects || includeProjects.includes("*")) {
      filteredProjects.push(...projects);
    } else {
      filteredProjects.push(...projects.filter((project) => includeProjects.includes(project.pathWithNamespace)));
    }

    return filteredProjects.map(({ id, pathWithNamespace }) => ({
      name: pathWithNamespace,
      externalId: id.toString(),
      type: SecretScanningResource.Project
    }));
  };

  const getScanPath: TSecretScanningFactoryGetScanPath<TGitLabDataSourceWithConnection> = async ({
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
    postInitialize
  };
};
