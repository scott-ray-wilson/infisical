import { faEye } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

import { SecretSyncLabel } from "@app/components/secret-syncs";
import { Badge, Table, TBody, Td, Th, THead, Tooltip, Tr } from "@app/components/v2";
import { AWS_REGIONS } from "@app/helpers/appConnections";
import { TAwsParameterStoreSync } from "@app/hooks/api/secretSyncs/types/aws-parameter-store-sync";

type Props = {
  secretSync: TAwsParameterStoreSync;
};

export const AwsParameterStoreSyncDestinationSection = ({ secretSync }: Props) => {
  const {
    destinationConfig: { path, region, keyId, tags, syncSecretMetadataAsTags }
  } = secretSync;

  const awsRegion = AWS_REGIONS.find((r) => r.slug === region);

  return (
    <>
      <SecretSyncLabel label="Region">
        {awsRegion?.name}
        <Badge className="ml-1" variant="success">
          {awsRegion?.slug}{" "}
        </Badge>
      </SecretSyncLabel>
      <SecretSyncLabel label="Path">{path}</SecretSyncLabel>
      {keyId && <SecretSyncLabel label="KMS Key">{keyId}</SecretSyncLabel>}
      {tags?.length && (
        <SecretSyncLabel label="Resource Tags">
          <Tooltip
            side="right"
            className="max-w-xl p-1"
            content={
              <Table>
                <THead>
                  <Th className="w-[40%] p-2">Key</Th>
                  <Th className="p-2">Value</Th>
                </THead>
                <TBody>
                  {tags.map((tag) => (
                    <Tr key={tag.key}>
                      <Td className="p-2">{tag.key}</Td>
                      <Td className="p-2">{tag.value}</Td>
                    </Tr>
                  ))}
                </TBody>
              </Table>
            }
          >
            <div className="w-min">
              <Badge className="flex h-5 w-min items-center gap-1.5 whitespace-nowrap bg-mineshaft-400/50 text-bunker-300">
                <FontAwesomeIcon icon={faEye} />
                <span>
                  {tags.length} Tag{tags.length > 1 ? "s" : ""}
                </span>
              </Badge>
            </div>
          </Tooltip>
        </SecretSyncLabel>
      )}
      {syncSecretMetadataAsTags && (
        <SecretSyncLabel label="Sync Secret Metadata as Resource Tags">
          <Badge variant="success">Enabled</Badge>
        </SecretSyncLabel>
      )}
    </>
  );
};
