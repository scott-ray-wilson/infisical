/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable no-param-reassign,no-await-in-loop */

import AWS, { AWSError } from "aws-sdk";

import { logger } from "@app/lib/logger";
import { getAwsConnectionConfig } from "@app/services/app-connection/aws/aws-connection-fns";
import { TAwsConnection } from "@app/services/app-connection/aws/aws-connection-types";
import { TAwsParameterStoreSync } from "@app/services/secret-sync/aws-parameter-store/aws-parameter-store-sync-types";
import { TSecretMap } from "@app/services/secret-sync/secret-sync-types";

export const awsParameterStoreSyncPushSecrets = async (
  secretSync: TAwsParameterStoreSync,
  appConnection: TAwsConnection,
  secrets: TSecretMap
) => {
  console.log("here 4");
  const { destinationConfig, projectId, secretPath, environment } = secretSync;
  const config = await getAwsConnectionConfig(appConnection, destinationConfig.region);

  const ssm = new AWS.SSM({
    apiVersion: "2014-11-06",
    region: destinationConfig.region
  });

  ssm.config.update(config);

  const awsParameterStoreSecretsObj: Record<string, AWS.SSM.Parameter & { KeyId?: string }> = {};

  let response: { isSynced: boolean; syncMessage: string } | null = null;

  logger.info(
    // TODO: update should delete
    `getIntegrationSecrets: integration sync triggered for ssm with [projectId=${projectId}] [environment=${environment.slug}]  [secretPath=${secretPath}] [shouldDisableDelete=${false}]`
  );
  // now fetch all aws parameter store secrets
  let hasNext = true;
  let nextToken: string | undefined;
  while (hasNext) {
    const parameters = await ssm
      .getParametersByPath({
        Path: destinationConfig.path,
        Recursive: false,
        WithDecryption: true,
        MaxResults: 10,
        NextToken: nextToken
      })
      .promise();

    if (parameters.Parameters) {
      parameters.Parameters.forEach((parameter) => {
        if (parameter.Name) {
          const secKey = parameter.Name.substring(destinationConfig.path.length);
          awsParameterStoreSecretsObj[secKey] = parameter;
        }
      });
    }
    hasNext = Boolean(parameters.NextToken);
    nextToken = parameters.NextToken;
  }

  const areParametersKmsKeysFetched = false;

  // TODO:
  // if (metadata.kmsKeyId) {
  //   // we put this inside a try catch so that existing integrations without the ssm:DescribeParameters
  //   // AWS permission will not break
  //   try {
  //     let hasNextDescribePage = true;
  //     let describeNextToken: string | undefined;
  //
  //     while (hasNextDescribePage) {
  //       const parameters = await ssm
  //         .describeParameters({
  //           MaxResults: 10,
  //           NextToken: describeNextToken,
  //           ParameterFilters: [
  //             {
  //               Key: "Path",
  //               Option: "OneLevel",
  //               Values: [integration.path as string]
  //             }
  //           ]
  //         })
  //         .promise();
  //
  //       if (parameters.Parameters) {
  //         parameters.Parameters.forEach((parameter) => {
  //           if (parameter.Name) {
  //             const secKey = parameter.Name.substring((integration.path as string).length);
  //             awsParameterStoreSecretsObj[secKey].KeyId = parameter.KeyId;
  //           }
  //         });
  //       }
  //       areParametersKmsKeysFetched = true;
  //       hasNextDescribePage = Boolean(parameters.NextToken);
  //       describeNextToken = parameters.NextToken;
  //     }
  //   } catch (error) {
  //     // eslint-disable-next-line @typescript-eslint/no-explicit-any
  //     if ((error as any).code === "AccessDeniedException") {
  //       logger.error(
  //         `AWS Parameter Store Error [integration=${integration.id}]: double check AWS account permissions (refer to the Infisical docs)`
  //       );
  //     }
  //
  //     response = {
  //       isSynced: false,
  //       syncMessage: (error as AWSError)?.message || "Error syncing with AWS Parameter Store"
  //     };
  //   }
  // }

  // Identify secrets to create
  // don't use Promise.all() and promise map here
  // it will cause rate limit
  for (const key in secrets) {
    if (Object.hasOwn(secrets, key)) {
      if (!(key in awsParameterStoreSecretsObj)) {
        // case: secret does not exist in AWS parameter store
        // -> create secret
        if (secrets[key].value) {
          logger.info(
            `getIntegrationSecrets: create secret in AWS SSM for [projectId=${projectId}] [environment=${environment.slug}]  [secretPath=${secretPath}]`
          );
          await ssm
            .putParameter({
              Name: `${destinationConfig.path}${key}`,
              Type: "SecureString",
              Value: secrets[key].value,
              // ...(metadata.kmsKeyId && { KeyId: metadata.kmsKeyId }),
              Overwrite: true
            })
            .promise();
          // if (metadata.secretAWSTag?.length) {
          //   try {
          //     await ssm
          //       .addTagsToResource({
          //         ResourceType: "Parameter",
          //         ResourceId: `${integration.path}${key}`,
          //         Tags: metadata.secretAWSTag
          //           ? metadata.secretAWSTag.map((tag: { key: string; value: string }) => ({
          //               Key: tag.key,
          //               Value: tag.value
          //             }))
          //           : []
          //       })
          //       .promise();
          //   } catch (err) {
          //     logger.error(
          //       err,
          //       `getIntegrationSecrets: create secret in AWS SSM for failed  [projectId=${projectId}] [environment=${integration.environment.slug}]  [secretPath=${integration.secretPath}]`
          //     );
          //     // eslint-disable-next-line @typescript-eslint/no-explicit-any
          //     if ((err as any).code === "AccessDeniedException") {
          //       logger.error(
          //         `AWS Parameter Store Error [integration=${integration.id}]: double check AWS account permissions (refer to the Infisical docs)`
          //       );
          //     }
          //
          //     response = {
          //       isSynced: false,
          //       syncMessage: (err as AWSError)?.message || "Error syncing with AWS Parameter Store"
          //     };
          //   }
          // }
        }
        // case: secret exists in AWS parameter store
      } else {
        logger.info(
          `getIntegrationSecrets: update secret in AWS SSM for [projectId=${projectId}] [environment=${environment.slug}]  [secretPath=${secretPath}]`
        );

        const shouldUpdateKms = areParametersKmsKeysFetched;
        // &&
        // Boolean(metadata.kmsKeyId) &&
        // awsParameterStoreSecretsObj[key].KeyId !== metadata.kmsKeyId;

        // we ensure that the KMS key configured in the integration is applied for ALL parameters on AWS
        if (secrets[key].value && (shouldUpdateKms || awsParameterStoreSecretsObj[key].Value !== secrets[key].value)) {
          await ssm
            .putParameter({
              Name: `${destinationConfig.path}${key}`,
              Type: "SecureString",
              Value: secrets[key].value,
              Overwrite: true
              // ...(metadata.kmsKeyId && { KeyId: metadata.kmsKeyId })
            })
            .promise();
        }

        if (awsParameterStoreSecretsObj[key].Name) {
          try {
            await ssm
              .addTagsToResource({
                ResourceType: "Parameter",
                ResourceId: awsParameterStoreSecretsObj[key].Name as string,
                Tags: []
                // Tags: metadata.secretAWSTag
                //   ? metadata.secretAWSTag.map((tag: { key: string; value: string }) => ({
                //       Key: tag.key,
                //       Value: tag.value
                //     }))
                //   : []
              })
              .promise();
          } catch (err) {
            logger.error(
              err,
              `getIntegrationSecrets: update secret in AWS SSM for failed  [projectId=${projectId}] [environment=${environment.slug}]  [secretPath=${secretPath}]`
            );
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            if ((err as any).code === "AccessDeniedException") {
              logger.error(
                `AWS Parameter Store Error [secretSync=${secretSync.id}]: double check AWS account permissions (refer to the Infisical docs)`
              );
            }

            response = {
              isSynced: false,
              syncMessage: (err as AWSError)?.message || "Error syncing with AWS Parameter Store"
            };
          }
        }
      }

      await new Promise((resolve) => {
        setTimeout(resolve, 50);
      });
    }
  }

  // if (!metadata.shouldDisableDelete) {
  //   logger.info(
  //     `getIntegrationSecrets: inside of shouldDisableDelete AWS SSM [projectId=${projectId}] [environment=${integration.environment.slug}]  [secretPath=${integration.secretPath}] [step=1]`
  //   );
  //   for (const key in awsParameterStoreSecretsObj) {
  //     if (Object.hasOwn(awsParameterStoreSecretsObj, key)) {
  //       logger.info(
  //         `getIntegrationSecrets: inside of shouldDisableDelete AWS SSM [projectId=${projectId}] [environment=${integration.environment.slug}]  [secretPath=${integration.secretPath}] [step=2]`
  //       );
  //       if (!(key in secrets) || !secrets[key].value) {
  //         logger.info(
  //           `getIntegrationSecrets: inside of shouldDisableDelete AWS SSM [projectId=${projectId}] [environment=${integration.environment.slug}]  [secretPath=${integration.secretPath}] [step=3]`
  //         );
  //         // case:
  //         // -> delete secret
  //         await ssm
  //           .deleteParameter({
  //             Name: awsParameterStoreSecretsObj[key].Name as string
  //           })
  //           .promise();
  //         logger.info(
  //           `getIntegrationSecrets: inside of shouldDisableDelete AWS SSM [projectId=${projectId}] [environment=${integration.environment.slug}]  [secretPath=${integration.secretPath}] [step=4]`
  //         );
  //       }
  //       await new Promise((resolve) => {
  //         setTimeout(resolve, 50);
  //       });
  //     }
  //   }
  // }

  return response;
};
