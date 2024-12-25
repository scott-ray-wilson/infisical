import AWS, { AWSError } from "aws-sdk";

import { getAwsConnectionConfig } from "@app/services/app-connection/aws/aws-connection-fns";
import { TAwsParameterStoreSyncWithConnection } from "@app/services/secret-sync/aws-parameter-store/aws-parameter-store-sync-types";
import { TSecretMap } from "@app/services/secret-sync/secret-sync-types";

type TAWSParameterStoreRecord = Record<string, AWS.SSM.Parameter & { KeyId?: string }>;

const getParametersByPath = async (
  ssm: AWS.SSM,
  path: string,
  awsParameterStoreSecretsRecord: TAWSParameterStoreRecord = {},
  nextToken?: string
): Promise<TAWSParameterStoreRecord> => {
  const resp = await ssm
    .getParametersByPath({
      Path: path,
      Recursive: false,
      WithDecryption: true,
      MaxResults: 10,
      NextToken: nextToken
    })
    .promise();

  if (resp.Parameters) {
    resp.Parameters.forEach((parameter) => {
      if (parameter.Name) {
        const secKey = parameter.Name.substring(path.length);
        // eslint-disable-next-line no-param-reassign
        awsParameterStoreSecretsRecord[secKey] = parameter;
      }
    });
  }

  if (!resp.NextToken) {
    return awsParameterStoreSecretsRecord;
  }

  return getParametersByPath(ssm, path, awsParameterStoreSecretsRecord, resp.NextToken);
};

export const awsParameterStoreSyncPushSecrets = async (
  secretSync: TAwsParameterStoreSyncWithConnection,
  secrets: TSecretMap
) => {
  const { destinationConfig, projectId, secretPath, environment, connection } = secretSync;

  // TODO(scott): KMS Key ID, Tags

  const config = await getAwsConnectionConfig(connection, destinationConfig.region);

  const ssm = new AWS.SSM({
    apiVersion: "2014-11-06",
    region: destinationConfig.region
  });

  ssm.config.update(config);

  try {
    const awsParameterStoreSecretsRecord = await getParametersByPath(ssm, destinationConfig.path);

    for await (const entry of Object.entries(secrets)) {
      const [key, { value }] = entry;

      if (key in awsParameterStoreSecretsRecord && awsParameterStoreSecretsRecord[key].Value === value) {
        break;
      }

      await ssm
        .putParameter({
          Name: `${destinationConfig.path}${key}`,
          Type: "SecureString",
          Value: value,
          Overwrite: true
        })
        .promise();
    }
  } catch (err) {
    return {
      isSynced: false,
      message: (err as AWSError)?.message
    };
  }

  return { isSynced: true, message: null };

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
};
