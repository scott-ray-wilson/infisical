import {
  faCalendarCheck,
  faCheckCircle,
  faCircleXmark,
  faEdit
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { format } from "date-fns";
import { twMerge } from "tailwind-merge";

import { ProjectPermissionCan } from "@app/components/permissions";
import { IconButton } from "@app/components/v2";
import { ProjectPermissionActions, ProjectPermissionSub } from "@app/context";
import { TSecretSync } from "@app/hooks/api/secretSyncs";

type Props = {
  secretSync: TSecretSync;
  onEditDetails: VoidFunction;
};

export const SecretSyncDetailsSection = ({ secretSync, onEditDetails }: Props) => {
  return (
    <div>
      <div className="flex w-full flex-col gap-3 rounded-lg border border-mineshaft-600 bg-mineshaft-900 px-4 py-3">
        <div className="flex items-center justify-between border-b border-mineshaft-400 pb-2">
          <h3 className="text-lg font-semibold text-mineshaft-100">Sync Details</h3>
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
              <p className="text-sm font-semibold text-mineshaft-300">Name</p>
              <p className="text-sm text-mineshaft-300">{secretSync.name}</p>
            </div>
            <div>
              <p className="text-sm font-semibold text-mineshaft-300">Status</p>
              <div className="flex items-center">
                <p
                  className={twMerge(
                    "mr-2 text-sm font-medium",
                    secretSync.isSynced ? "text-green-500" : "text-red-500"
                  )}
                >
                  {secretSync.isSynced ? "Synced" : "Not Synced"}
                </p>
                <FontAwesomeIcon
                  size="sm"
                  className={twMerge(secretSync.isSynced ? "text-green-500" : "text-red-500")}
                  icon={secretSync.isSynced ? faCheckCircle : faCircleXmark}
                />
              </div>
            </div>
            {secretSync.lastSyncedAt && (
              <div>
                <p className="text-sm font-semibold text-mineshaft-300">Latest Successful Sync</p>
                <div className="flex items-center gap-2 text-sm text-mineshaft-300">
                  {format(new Date(secretSync.lastSyncedAt), "yyyy-MM-dd, hh:mm aaa")}
                  <FontAwesomeIcon icon={faCalendarCheck} className="pt-0.5 pr-2 text-sm" />
                </div>
              </div>
            )}

            <div>
              {!secretSync.isSynced && secretSync.lastSyncMessage && (
                <>
                  <p className="text-sm font-semibold text-mineshaft-300">Latest Sync Error</p>
                  <p className="text-sm text-mineshaft-300">{secretSync.lastSyncMessage}</p>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
