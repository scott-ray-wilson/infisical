import { faEdit } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { format } from "date-fns";

import { ProjectPermissionCan } from "@app/components/permissions";
import { SecretSyncStatusBadge } from "@app/components/secret-syncs";
import { IconButton } from "@app/components/v2";
import { ProjectPermissionActions, ProjectPermissionSub } from "@app/context";
import { SecretSyncStatus, TSecretSync } from "@app/hooks/api/secretSyncs";

type Props = {
  secretSync: TSecretSync;
  onEditDetails: VoidFunction;
};

export const SecretSyncDetailsSection = ({ secretSync, onEditDetails }: Props) => {
  const { syncStatus, lastSyncMessage, lastSyncedAt, name, description } = secretSync;

  return (
    <div className="flex w-full flex-col gap-3 rounded-lg border border-mineshaft-600 bg-mineshaft-900 px-4 py-3">
      <div className="flex items-center justify-between border-b border-mineshaft-400 pb-2">
        <h3 className="font-semibold text-mineshaft-100">Details</h3>
        <ProjectPermissionCan
          I={ProjectPermissionActions.Edit}
          a={ProjectPermissionSub.SecretSyncs}
        >
          {(isAllowed) => (
            <IconButton
              variant="plain"
              colorSchema="secondary"
              isDisabled={!isAllowed}
              ariaLabel="Edit sync details"
              onClick={onEditDetails}
            >
              <FontAwesomeIcon icon={faEdit} />
            </IconButton>
          )}
        </ProjectPermissionCan>
      </div>
      <div>
        <div className="space-y-3">
          <div>
            <p className="text-xs font-medium text-mineshaft-400">Name</p>
            <p className="text-sm text-mineshaft-100">{name}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-mineshaft-400">Description</p>
            <p className="text-sm text-mineshaft-100">{description || "-"}</p>
          </div>
          {syncStatus && (
            <div>
              <p className="text-xs font-medium text-mineshaft-400">Status</p>
              <div className="mt-1 flex items-center">
                <SecretSyncStatusBadge status={syncStatus} />
              </div>
            </div>
          )}
          {lastSyncedAt && (
            <div>
              <p className="text-xs font-medium text-mineshaft-400">Last Synced</p>
              <div className="flex items-center gap-2 text-sm text-mineshaft-100">
                {format(new Date(lastSyncedAt), "yyyy-MM-dd, hh:mm aaa")}
              </div>
            </div>
          )}
          {syncStatus === SecretSyncStatus.Failed && lastSyncMessage && (
            <div>
              <p className="text-xs font-medium text-mineshaft-400">Latest Sync Error</p>
              <p className="text-sm text-mineshaft-100">{lastSyncMessage}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
