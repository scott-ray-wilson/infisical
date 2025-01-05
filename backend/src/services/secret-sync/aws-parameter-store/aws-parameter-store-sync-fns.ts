import AWS from "aws-sdk";

import { logger } from "@app/lib/logger";
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

  // TODO: sleep

  return getParametersByPath(ssm, path, awsParameterStoreSecretsRecord, resp.NextToken);
};

export const awsParameterStoreSyncPushSecrets = async (
  secretSync: TAwsParameterStoreSyncWithConnection,
  secrets: TSecretMap
) => {
  const { destinationConfig, connection } = secretSync;

  // TODO(scott): KMS Key ID, Tags

  const config = await getAwsConnectionConfig(connection, destinationConfig.region);

  const ssm = new AWS.SSM({
    apiVersion: "2014-11-06",
    region: destinationConfig.region
  });

  ssm.config.update(config);

  const awsParameterStoreSecretsRecord = await getParametersByPath(ssm, destinationConfig.path);

  for await (const entry of Object.entries(secrets)) {
    const [key, { value }] = entry;

    if (!value || (key in awsParameterStoreSecretsRecord && awsParameterStoreSecretsRecord[key].Value === value)) {
      // eslint-disable-next-line no-continue
      continue;
    }

    const resp = await ssm
      .putParameter({
        Name: `${destinationConfig.path}${key}`,
        Type: "SecureString",
        Value: value,
        Overwrite: true
      })
      .promise();

    // TODO: sleep

    logger.info(resp, "resp");
  }

  // TODO: option to skip delete

  for await (const parameterKey of Object.keys(awsParameterStoreSecretsRecord).filter(
    (key) => !(key in secrets) || !secrets[key].value
  )) {
    await ssm
      .deleteParameter({
        Name: awsParameterStoreSecretsRecord[parameterKey].Name as string
      })
      .promise();

    // TODO: sleep
  }

  return { isSynced: true, syncMessage: null };
};
