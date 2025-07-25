import { join } from "path";

import { TQueueBitbucketResourceDiffScan } from "@app/ee/services/secret-scanning-v2/bitbucket";
import { TGitHubDataSourceWithConnection } from "@app/ee/services/secret-scanning-v2/github";
import { SecretScanningResource } from "@app/ee/services/secret-scanning-v2/secret-scanning-v2-enums";
import { cloneRepository } from "@app/ee/services/secret-scanning-v2/secret-scanning-v2-fns";
import {
  TSecretScanningFactoryGetDiffScanFindingsPayload,
  TSecretScanningFactoryGetDiffScanResourcePayload,
  TSecretScanningFactoryGetFullScanPath,
  TSecretScanningFactoryInitialize,
  TSecretScanningFactoryListRawResources,
  TSecretScanningFactoryParams,
  TSecretScanningFactoryPostInitialization,
  TSecretScanningFactoryTeardown
} from "@app/ee/services/secret-scanning-v2/secret-scanning-v2-types";
import { getConfig } from "@app/lib/config/env";
import { BadRequestError, InternalServerError } from "@app/lib/errors";
import { alphaNumericNanoId } from "@app/lib/nanoid";
import {
  getGitLabConnectionClient,
  getGitLabInstanceUrl,
  GitLabAccessTokenType,
  GitLabConnectionMethod,
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
  > = async ({ payload, connection }, callback) => {
    const token = alphaNumericNanoId(64);

    const client = await getGitLabConnectionClient(connection, appConnectionDAL, kmsService);
    const appCfg = getConfig();

    switch (connection.method) {
      case GitLabConnectionMethod.AccessToken: {
        switch (connection.credentials.accessTokenType) {
          case GitLabAccessTokenType.Project: {
            const [project] = await client.Projects.all({
              archived: false,
              includePendingDelete: false,
              membership: true,
              includeHidden: false,
              imported: false
            });

            if (!project) {
              throw new BadRequestError({ message: "Could not find project associated with access token." });
            }

            const hook = await client.ProjectHooks.add(
              project.id,
              `${appCfg.SITE_URL}/secret-scanning/webhooks/gitlab`,
              {
                token,
                pushEvents: true,
                enableSslVerification: true,
                // @ts-expect-error gitbeaker is outdated, and the types don't support this field yet
                name: "Infisical Secret Scanning"
              }
            );

            return callback({
              credentials: {
                token,
                hookId: hook.id,
                projectId: project.id
              }
            });
          }
          default:
            throw new Error(`Unhandled GitLab Access Token Type: ${connection.credentials.accessTokenType}`);
        }
        break;
      }
      default:
        throw new InternalServerError({
          message: `Unhandled GitLab Connection Method: ${connection.method as GitLabConnectionMethod}`
        });
    }

    //
    // try {
    //   return await callback({
    //     credentials: {
    //       token,
    //       hookId: hook.id,
    //       projectId: project.id,
    //       method: GitLabConnectionMethod.ProjectAccessToken
    //     }
    //   });
    // } catch (error) {
    //   try {
    //     await client.ProjectHooks.remove(project.id, hook.id);
    //   } catch {
    //     // do nothing, just try to clean up webhook
    //   }
    //
    //   throw error;
    // }
    //
    // break;

    // case GitLabConnectionMethod.GroupAccessToken: {
    //   // TODO
    //   return callback({ token });
    //
    //   break;
    // }
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

    const client = await getGitLabConnectionClient(connection, appConnectionDAL, kmsService);

    const projects = await client.Projects.all({
      archived: false,
      includePendingDelete: false,
      membership: true,
      includeHidden: false,
      imported: false
    });

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

  const getFullScanPath: TSecretScanningFactoryGetFullScanPath<TGitLabDataSourceWithConnection> = async ({
    dataSource,
    resourceName,
    tempFolder
  }) => {
    const { connection } = dataSource;

    const instanceUrl = await getGitLabInstanceUrl(connection.credentials.instanceUrl);

    const client = await getGitLabConnectionClient(connection, appConnectionDAL, kmsService);

    const user = await client.Users.showCurrentUser();

    const repoPath = join(tempFolder, "repo.git");

    await cloneRepository({
      // TODO: test main domain with self-hosted
      cloneUrl: `https://${user.username}:${connection.credentials.accessToken}@${getMainDomain(instanceUrl)}/${resourceName}.git`,
      repoPath
    });

    return repoPath;
  };

  const teardown: TSecretScanningFactoryTeardown<TGitHubDataSourceWithConnection> = async () => {
    // no teardown required
  };

  const getDiffScanResourcePayload: TSecretScanningFactoryGetDiffScanResourcePayload<
    TQueueBitbucketResourceDiffScan["payload"]
  > = ({ repository }) => {
    // return {
    //   name: repository.full_name,
    //   externalId: repository.uuid,
    //   type: SecretScanningResource.Repository
    // };
  };

  const getDiffScanFindingsPayload: TSecretScanningFactoryGetDiffScanFindingsPayload<
    TGitLabDataSourceWithConnection,
    TQueueBitbucketResourceDiffScan["payload"]
  > = async ({ dataSource, payload, resourceName, configPath }) => {
    // const {
    //   connection: {
    //     credentials: { apiToken, email }
    //   }
    // } = dataSource;
    //
    // const { push, repository } = payload;
    //
    // const allFindings: SecretMatch[] = [];
    //
    // const authHeader = `Basic ${Buffer.from(`${email}:${apiToken}`).toString("base64")}`;
    //
    // for (const change of push.changes) {
    //   for (const commit of change.commits) {
    //     // eslint-disable-next-line no-await-in-loop
    //     const { data: diffstat } = await request.get<{
    //       values: {
    //         status: "added" | "modified" | "removed" | "renamed";
    //         new?: { path: string };
    //         old?: { path: string };
    //       }[];
    //     }>(`${IntegrationUrls.BITBUCKET_API_URL}/2.0/repositories/${repository.full_name}/diffstat/${commit.hash}`, {
    //       headers: {
    //         Authorization: authHeader,
    //         Accept: "application/json"
    //       }
    //     });
    //
    //     // eslint-disable-next-line no-continue
    //     if (!diffstat.values) continue;
    //
    //     for (const file of diffstat.values) {
    //       if ((file.status === "added" || file.status === "modified") && file.new?.path) {
    //         const filePath = file.new.path;
    //
    //         // eslint-disable-next-line no-await-in-loop
    //         const { data: patch } = await request.get<string>(
    //           `https://api.bitbucket.org/2.0/repositories/${repository.full_name}/diff/${commit.hash}`,
    //           {
    //             params: {
    //               path: filePath
    //             },
    //             headers: {
    //               Authorization: authHeader
    //             },
    //             responseType: "text"
    //           }
    //         );
    //
    //         // eslint-disable-next-line no-continue
    //         if (!patch) continue;
    //
    //         // eslint-disable-next-line no-await-in-loop
    //         const findings = await scanContentAndGetFindings(replaceNonChangesWithNewlines(`\n${patch}`), configPath);
    //
    //         const adjustedFindings = findings.map((finding) => {
    //           const startLine = convertPatchLineToFileLineNumber(patch, finding.StartLine);
    //           const endLine =
    //             finding.StartLine === finding.EndLine
    //               ? startLine
    //               : convertPatchLineToFileLineNumber(patch, finding.EndLine);
    //           const startColumn = finding.StartColumn - 1; // subtract 1 for +
    //           const endColumn = finding.EndColumn - 1; // subtract 1 for +
    //           const authorName = commit.author.user?.display_name || commit.author.raw.split(" <")[0];
    //           const emailMatch = commit.author.raw.match(/<(.*)>/);
    //           const authorEmail = emailMatch?.[1] ?? "";
    //
    //           return {
    //             ...finding,
    //             StartLine: startLine,
    //             EndLine: endLine,
    //             StartColumn: startColumn,
    //             EndColumn: endColumn,
    //             File: filePath,
    //             Commit: commit.hash,
    //             Author: authorName,
    //             Email: authorEmail,
    //             Message: commit.message,
    //             Fingerprint: `${commit.hash}:${filePath}:${finding.RuleID}:${startLine}:${startColumn}`,
    //             Date: commit.date,
    //             Link: `https://bitbucket.org/${resourceName}/src/${commit.hash}/${filePath}#lines-${startLine}`
    //           };
    //         });
    //
    //         allFindings.push(...adjustedFindings);
    //       }
    //     }
    //   }
    // }
    //
    // return allFindings.map(
    //   ({
    //      // discard match and secret as we don't want to store
    //      Match,
    //      Secret,
    //      ...finding
    //    }) => ({
    //     details: titleCaseToCamelCase(finding),
    //     fingerprint: finding.Fingerprint,
    //     severity: SecretScanningFindingSeverity.High,
    //     rule: finding.RuleID
    //   })
    // );
  };

  return {
    listRawResources,
    getFullScanPath,
    initialize,
    postInitialization,
    teardown
  };
};
