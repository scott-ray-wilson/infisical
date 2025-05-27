import { join } from "path";
import { ProbotOctokit } from "probot";

import { SecretScanningResource } from "@app/ee/services/secret-scanning-v2/secret-scanning-v2-enums";
import { cloneRepository } from "@app/ee/services/secret-scanning-v2/secret-scanning-v2-fns";
import {
  TSecretScanningFactoryGetScanPath,
  TSecretScanningFactoryInitialize,
  TSecretScanningFactoryListRawResources,
  TSecretScanningFactoryPostInitialization
} from "@app/ee/services/secret-scanning-v2/secret-scanning-v2-types";
import { getConfig } from "@app/lib/config/env";
import { listGitHubRadarRepositories, TGitHubRadarConnection } from "@app/services/app-connection/github-radar";

import { TGitHubDataSourceWithConnection } from "./github-secret-scanning-types";

export const GitHubSecretScanningFactory = () => {
  const initialize: TSecretScanningFactoryInitialize<TGitHubRadarConnection> = async ({ connection }, callback) => {
    const externalId = connection.credentials.installationId;

    // TODO: check if existing data source using installationId

    return callback({
      externalId
    });
  };

  const postInitialization: TSecretScanningFactoryPostInitialization<TGitHubRadarConnection> = async () => {
    // no post-initialization required
  };

  const listRawResources: TSecretScanningFactoryListRawResources<TGitHubDataSourceWithConnection> = async (
    dataSource
  ) => {
    const {
      connection,
      config: { includeRepos }
    } = dataSource;

    const repos = await listGitHubRadarRepositories(connection);

    const filteredRepos: typeof repos = [];
    if (includeRepos.includes("*")) {
      filteredRepos.push(...repos);
    } else {
      filteredRepos.push(...repos.filter((repo) => includeRepos.includes(repo.full_name)));
    }

    return filteredRepos.map(({ id, full_name }) => ({
      name: full_name,
      externalId: id.toString(),
      type: SecretScanningResource.Project
    }));
  };

  const getScanPath: TSecretScanningFactoryGetScanPath<TGitHubDataSourceWithConnection> = async ({
    dataSource,
    resourceName,
    tempFolder
  }) => {
    const appCfg = getConfig();
    const {
      connection: {
        credentials: { installationId }
      }
    } = dataSource;

    const octokit = new ProbotOctokit({
      auth: {
        appId: appCfg.INF_APP_CONNECTION_GITHUB_RADAR_APP_ID,
        privateKey: appCfg.INF_APP_CONNECTION_GITHUB_RADAR_APP_PRIVATE_KEY,
        installationId
      }
    });

    const {
      data: { token }
    } = await octokit.apps.createInstallationAccessToken({
      installation_id: Number(installationId)
    });

    const repoPath = join(tempFolder, "repo.git");

    await cloneRepository({
      cloneUrl: `https://x-access-token:${token}@github.com/${resourceName}.git`,
      repoPath
    });

    return repoPath;
  };

  return {
    initialize,
    postInitialization,
    listRawResources,
    getScanPath
  };
};
