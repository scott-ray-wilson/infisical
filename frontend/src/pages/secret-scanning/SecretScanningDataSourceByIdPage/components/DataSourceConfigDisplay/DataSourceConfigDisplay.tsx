import {
  SecretScanningDataSource,
  TSecretScanningDataSource
} from "@app/hooks/api/secretScanningV2";

import { GitHubDataSourceConfigDisplay } from "./GitHubDataSourceConfigDisplay";
import { GitLabDataSourceConfigDisplay } from "./GitLabDataSourceConfigDisplay";

type Props = {
  dataSource: TSecretScanningDataSource;
};

export const DataSourceConfigDisplay = ({ dataSource }: Props) => {
  switch (dataSource.type) {
    case SecretScanningDataSource.GitLab:
      return <GitLabDataSourceConfigDisplay dataSource={dataSource} />;
    case SecretScanningDataSource.GitHub:
      return <GitHubDataSourceConfigDisplay dataSource={dataSource} />;
    default:
      throw new Error(
        `Unhandled dataSource type ${(dataSource as TSecretScanningDataSource).type}`
      );
  }
};
