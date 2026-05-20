import { GenericFieldLabel } from "@app/components/secret-syncs";
import { Tooltip, TooltipContent, TooltipTrigger } from "@app/components/v3";
import { TOCIVaultSync } from "@app/hooks/api/secretSyncs/types/oci-vault-sync";

type Props = {
  secretSync: TOCIVaultSync;
};

export const OCIVaultSyncDestinationSection = ({ secretSync }: Props) => {
  const {
    destinationConfig: { compartmentOcid, keyOcid, vaultOcid }
  } = secretSync;

  return (
    <>
      <Tooltip>
        <TooltipTrigger asChild>
          <div>
            <GenericFieldLabel label="Compartment OCID">
              {compartmentOcid.substring(0, 21)}...
              {compartmentOcid.substring(compartmentOcid.length - 6)}
            </GenericFieldLabel>
          </div>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-sm break-words select-text">
          {compartmentOcid}
        </TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger asChild>
          <div>
            <GenericFieldLabel label="Vault OCID">
              {vaultOcid.substring(0, 15)}...
              {vaultOcid.substring(vaultOcid.length - 6)}
            </GenericFieldLabel>
          </div>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-sm break-words select-text">
          {compartmentOcid}
        </TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger asChild>
          <div>
            <GenericFieldLabel label="Key OCID">
              {keyOcid.substring(0, 13)}...
              {keyOcid.substring(keyOcid.length - 6)}
            </GenericFieldLabel>
          </div>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-sm break-words select-text">
          {compartmentOcid}
        </TooltipContent>
      </Tooltip>
    </>
  );
};
