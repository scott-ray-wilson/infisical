import { faArrowUpRightFromSquare, faBookOpen, faPlus } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

import { ProjectPermissionCan } from "@app/components/permissions";
import { Button } from "@app/components/v2";
import { ProjectPermissionActions, ProjectPermissionSub } from "@app/context";
import { usePopUp } from "@app/hooks";
import { TSecretSync } from "@app/hooks/api/secretSyncs";

import { CreateSecretSyncModal } from "../../../../../components/secret-syncs/CreateSecretSyncModal.tsx";
import { SecretSyncsTable } from "./SecretSyncTable";

type Props = {
  secretSyncs: TSecretSync[];
};

export const SecretSyncsTab = ({ secretSyncs }: Props) => {
  const { popUp, handlePopUpOpen, handlePopUpToggle } = usePopUp(["addSync"] as const);

  return (
    <>
      <div className="w-full rounded-lg border border-mineshaft-600 bg-mineshaft-900 p-4">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <div className="flex items-start gap-1">
              <p className="text-xl font-semibold text-mineshaft-100">Secret Syncs</p>
              <a
                href="https://infisical.com/docs/integrations/secret-syncs/overview"
                target="_blank"
                rel="noopener noreferrer"
              >
                <div className="ml-1 mt-[0.32rem] inline-block rounded-md bg-yellow/20 px-1.5 text-sm text-yellow opacity-80 hover:opacity-100">
                  <FontAwesomeIcon icon={faBookOpen} className="mr-1.5" />
                  <span>Docs</span>
                  <FontAwesomeIcon
                    icon={faArrowUpRightFromSquare}
                    className="mb-[0.07rem] ml-1.5 text-[10px]"
                  />
                </div>
              </a>
            </div>
            <p className="text-sm text-bunker-300">
              Use App Connections to sync secrets to third-party services.
            </p>
          </div>
          <ProjectPermissionCan
            I={ProjectPermissionActions.Create}
            a={ProjectPermissionSub.SecretSyncs}
          >
            {(isAllowed) => (
              <Button
                colorSchema="secondary"
                type="submit"
                leftIcon={<FontAwesomeIcon icon={faPlus} />}
                onClick={() => handlePopUpOpen("addSync")}
                isDisabled={!isAllowed}
              >
                Add Sync
              </Button>
            )}
          </ProjectPermissionCan>
        </div>
        <SecretSyncsTable secretSyncs={secretSyncs} />
      </div>
      <CreateSecretSyncModal
        isOpen={popUp.addSync.isOpen}
        onOpenChange={(isOpen) => handlePopUpToggle("addSync", isOpen)}
      />
    </>
  );
};
