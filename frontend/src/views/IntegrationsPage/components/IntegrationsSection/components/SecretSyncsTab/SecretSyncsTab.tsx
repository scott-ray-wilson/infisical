import Link from "next/link";
import { faArrowUpRightFromSquare, faBookOpen, faPlus } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

import { Button } from "@app/components/v2";
import { usePopUp } from "@app/hooks";
import { TSecretSync } from "@app/hooks/api/secretSyncs";

import { CreateSecretSyncModal } from "./CreateSecretSyncModal";
import { SecretSyncsTable } from "./SecretSyncsTable";

type Props = {
  secretSyncs: TSecretSync[];
};

export const SecretSyncsTab = ({ secretSyncs }: Props) => {
  const { popUp, handlePopUpOpen, handlePopUpClose, handlePopUpToggle } = usePopUp([
    "addSync"
  ] as const);

  return (
    <>
      <div className="w-full rounded-lg border border-mineshaft-600 bg-mineshaft-900 p-4">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <div className="flex items-start gap-1">
              <p className="text-xl font-semibold text-mineshaft-100">Secret Syncs</p>

              <Link href="https://infisical.com/docs/integrations/secret-syncs/overview" passHref>
                <a target="_blank" rel="noopener noreferrer">
                  <div className="ml-1 mt-[0.32rem] inline-block rounded-md bg-yellow/20 px-1.5 text-sm text-yellow opacity-80 hover:opacity-100">
                    <FontAwesomeIcon icon={faBookOpen} className="mr-1.5" />
                    <span>Docs</span>
                    <FontAwesomeIcon
                      icon={faArrowUpRightFromSquare}
                      className="ml-1.5 mb-[0.07rem] text-[10px]"
                    />
                  </div>
                </a>
              </Link>
            </div>
            <p className="text-sm text-bunker-300">
              Use App Connections to sync secrets to third-party providers.
            </p>
          </div>
          <Button
            colorSchema="secondary"
            type="submit"
            leftIcon={<FontAwesomeIcon icon={faPlus} />}
            onClick={() => handlePopUpOpen("addSync")}
          >
            Add Sync
          </Button>
        </div>
        <SecretSyncsTable secretSyncs={secretSyncs} />
      </div>
      <CreateSecretSyncModal
        isOpen={popUp.addSync.isOpen}
        onOpenChange={(isOpen) => handlePopUpToggle("addSync", isOpen)}
      />
      {/* <DeleteActionModal
        isOpen={popUp.deleteConfirmation.isOpen}
        title={`Are you sure want to remove ${
          (popUp?.deleteConfirmation.data as TIntegration)?.integration || " "
        } integration for ${
          (popUp?.deleteConfirmation.data as TIntegration)?.app || "this project"
        }?`}
        onChange={(isOpen) => handlePopUpToggle("deleteConfirmation", isOpen)}
        deleteKey={
          ((popUp?.deleteConfirmation?.data as TIntegration)?.integration ===
            "azure-app-configuration" &&
            (popUp?.deleteConfirmation?.data as TIntegration)?.app
              ?.split("//")[1]
              ?.split(".")[0]) ||
          (popUp?.deleteConfirmation?.data as TIntegration)?.app ||
          (popUp?.deleteConfirmation?.data as TIntegration)?.owner ||
          (popUp?.deleteConfirmation?.data as TIntegration)?.path ||
          (popUp?.deleteConfirmation?.data as TIntegration)?.integration ||
          ""
        }
        onDeleteApproved={async () => {
          if (shouldDeleteSecrets) {
            handlePopUpOpen("deleteSecretsConfirmation");
            return;
          }

          await onIntegrationDelete(
            (popUp?.deleteConfirmation.data as TIntegration).id,
            false,
            () => handlePopUpClose("deleteConfirmation")
          );
        }}
      >
        {(popUp?.deleteConfirmation?.data as TIntegration)?.integration === "github" && (
          <div className="mt-4">
            <Checkbox
              id="delete-integration-secrets"
              checkIndicatorBg="text-white"
              onCheckedChange={() => setShouldDeleteSecrets.toggle()}
            >
              Delete previously synced secrets from the destination
            </Checkbox>
          </div>
        )}
      </DeleteActionModal> */}
      {/* <DeleteActionModal
        isOpen={popUp.deleteSecretsConfirmation.isOpen}
        title={`Are you sure you also want to delete secrets on ${
          (popUp?.deleteConfirmation.data as TIntegration)?.integration
        }?`}
        subTitle="By confirming, you acknowledge that all secrets managed by this integration will be removed from the destination. This action is irreversible."
        onChange={(isOpen) => handlePopUpToggle("deleteSecretsConfirmation", isOpen)}
        deleteKey="confirm"
        onDeleteApproved={async () => {
          await onIntegrationDelete(
            (popUp?.deleteConfirmation.data as TIntegration).id,
            true,
            () => {
              handlePopUpClose("deleteSecretsConfirmation");
              handlePopUpClose("deleteConfirmation");
            }
          );
        }}
      /> */}
    </>
  );
};
