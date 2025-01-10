import { faEdit } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

import { ProjectPermissionCan } from "@app/components/permissions";
import { IconButton } from "@app/components/v2";
import { ProjectPermissionActions, ProjectPermissionSub } from "@app/context";
import { TSecretSync } from "@app/hooks/api/secretSyncs";

type Props = {
  secretSync: TSecretSync;
  onEditOptions: VoidFunction;
};

export const SecretSyncOptionsSection = ({ secretSync, onEditOptions }: Props) => {
  const {
    syncOptions: { appendSuffix, prependPrefix }
  } = secretSync;

  return (
    <div>
      <div className="flex w-full flex-col gap-3 rounded-lg border border-mineshaft-600 bg-mineshaft-900 px-4 py-3">
        <div className="flex items-center justify-between border-b border-mineshaft-400 pb-2">
          <h3 className="font-semibold text-mineshaft-100">Sync Options</h3>
          <ProjectPermissionCan
            I={ProjectPermissionActions.Edit}
            a={ProjectPermissionSub.SecretSyncs}
          >
            {(isAllowed) => (
              <IconButton
                variant="plain"
                colorSchema="secondary"
                isDisabled={!isAllowed}
                ariaLabel="Edit sync options"
                onClick={onEditOptions}
              >
                <FontAwesomeIcon icon={faEdit} />
              </IconButton>
            )}
          </ProjectPermissionCan>
        </div>
        <div>
          <div className="space-y-3">
            <div>
              <p className="text-xs font-medium text-mineshaft-400">Prefix</p>
              <p className="text-sm text-mineshaft-100">{prependPrefix ?? "-"}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-mineshaft-400">Suffix</p>
              <p className="text-sm text-mineshaft-100">{appendSuffix ?? "-"}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
