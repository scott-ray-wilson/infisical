import { Td, Tooltip } from "@app/components/v2";
import { AWS_REGIONS } from "@app/helpers/appConnections";
import { removeTrailingSlash } from "@app/helpers/string";
import { TAwsParameterStoreSync } from "@app/hooks/api/secretSyncs/types/aws-parameter-store-sync";

type Props = {
  secretSync: TAwsParameterStoreSync;
};

export const AwsParameterStoreDestinationCol = ({ secretSync }: Props) => {
  const { region, path } = secretSync.destinationConfig;

  return (
    <Td>
      <Tooltip side="left" className="max-w-2xl break-words" content={removeTrailingSlash(path)}>
        <p className="truncate text-sm">{removeTrailingSlash(path)}</p>
      </Tooltip>
      <p className="text-xs leading-3 text-bunker-300">
        {AWS_REGIONS.find((reg) => reg.slug === region)!.name}
      </p>
    </Td>
  );
};
