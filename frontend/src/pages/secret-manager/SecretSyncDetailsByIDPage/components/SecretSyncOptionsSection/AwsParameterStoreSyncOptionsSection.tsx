import { EyeIcon } from "lucide-react";

import { GenericFieldLabel } from "@app/components/secret-syncs";
import {
  Badge,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Tooltip,
  TooltipContent,
  TooltipTrigger
} from "@app/components/v3";
import { TAwsParameterStoreSync } from "@app/hooks/api/secretSyncs/types/aws-parameter-store-sync";

type Props = {
  secretSync: TAwsParameterStoreSync;
};

export const AwsParameterStoreSyncOptionsSection = ({ secretSync }: Props) => {
  const {
    syncOptions: { keyId, tags, syncSecretMetadataAsTags }
  } = secretSync;

  return (
    <>
      {keyId && <GenericFieldLabel label="KMS Key">{keyId}</GenericFieldLabel>}
      {tags && tags.length > 0 && (
        <GenericFieldLabel label="Resource Tags">
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="inline-block w-min">
                <Badge variant="neutral">
                  <EyeIcon />
                  {tags.length} Tag{tags.length > 1 ? "s" : ""}
                </Badge>
              </span>
            </TooltipTrigger>
            <TooltipContent side="right" className="max-w-xl bg-background p-1">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="p-2 whitespace-nowrap">Key</TableHead>
                    <TableHead className="p-2">Value</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tags.map((tag) => (
                    <TableRow key={tag.key}>
                      <TableCell className="p-2">{tag.key}</TableCell>
                      <TableCell className="p-2">{tag.value}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TooltipContent>
          </Tooltip>
        </GenericFieldLabel>
      )}
      {syncSecretMetadataAsTags && (
        <GenericFieldLabel label="Sync Secret Metadata as Resource Tags">
          <Badge variant="success">Enabled</Badge>
        </GenericFieldLabel>
      )}
    </>
  );
};
