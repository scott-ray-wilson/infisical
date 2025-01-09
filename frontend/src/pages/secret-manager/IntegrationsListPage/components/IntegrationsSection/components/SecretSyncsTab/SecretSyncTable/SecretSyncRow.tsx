import { useMemo } from "react";
import {
  faCalendarCheck,
  faCheck,
  faInfoCircle,
  faRefresh,
  faRotate,
  faTrash,
  faWarning,
  faXmark
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { format } from "date-fns";
import { twMerge } from "tailwind-merge";

import { ProjectPermissionCan } from "@app/components/permissions";
import { Badge, IconButton, Td, Tooltip, Tr } from "@app/components/v2";
import { ProjectPermissionActions, ProjectPermissionSub } from "@app/context";
import { SECRET_SYNC_MAP } from "@app/helpers/secretSyncs";
import { TSecretSync } from "@app/hooks/api/secretSyncs";

import { getSecretSyncDestinationColValues } from "./helpers";
import { SecretSyncTableCell } from "./SecretSyncTableCell";

type Props = {
  secretSync: TSecretSync;
  onDelete: (secretSync: TSecretSync) => void;
  onTriggerSync: (secretSync: TSecretSync) => void;
};

export const SecretSyncRow = ({ secretSync, onDelete, onTriggerSync }: Props) => {
  const {
    id,
    folder: { path: secretPath },
    lastSyncMessage,
    isSynced,
    destination,
    lastSyncedAt,
    environment,
    name,
    description
  } = secretSync;

  const failureMessage = useMemo(() => {
    if (isSynced === false) {
      if (lastSyncMessage)
        try {
          return JSON.stringify(JSON.parse(lastSyncMessage), null, 2);
        } catch {
          return lastSyncMessage;
        }

      return "An Unknown Error Occurred.";
    }
    return null;
  }, [isSynced, lastSyncMessage]);

  const destinationDetails = SECRET_SYNC_MAP[destination];

  const destinationValues = getSecretSyncDestinationColValues(secretSync);

  return (
    <Tr
      // onClick={() => router.push(`/integrations/secret-syncs/${destination}/${id}`)}
      className={twMerge(
        "group h-10 cursor-pointer transition-colors duration-100 hover:bg-mineshaft-700",
        isSynced === false && "bg-red/5 hover:bg-red/10"
      )}
      key={`integration-${id}`}
    >
      <Td>
        <img
          alt={`${destinationDetails.name} sync`}
          src={`/images/integrations/${destinationDetails.image}`}
          className="min-w-[1.5rem]"
        />
      </Td>
      <Td className="!min-w-[8rem] max-w-0">
        <div>
          <div className="flex w-full items-center">
            <p className="truncate">{name}</p>
            {description && (
              <Tooltip content={description}>
                <FontAwesomeIcon
                  icon={faInfoCircle}
                  size="xs"
                  className="ml-1 text-mineshaft-400"
                />
              </Tooltip>
            )}
          </div>
          <p className="truncate text-xs leading-3 text-bunker-300">{destinationDetails.name}</p>
        </div>
      </Td>
      <SecretSyncTableCell primaryText={secretPath} secondaryText={environment.name} />
      <SecretSyncTableCell
        primaryText={destinationValues.primaryText}
        secondaryText={destinationValues.secondaryText}
      />
      <Td className="whitespace-nowrap">
        {typeof isSynced !== "boolean" ? (
          <Badge variant="primary">
            <div className="flex items-center space-x-1">
              <FontAwesomeIcon icon={faRotate} />
              <div>Syncing</div>
            </div>
          </Badge>
        ) : (
          <Tooltip
            position="left"
            className="max-w-sm"
            content={
              <div className="flex flex-col gap-2 whitespace-normal py-1">
                {lastSyncedAt && (
                  <div>
                    <div
                      className={`mb-2 flex self-start ${!isSynced ? "text-yellow" : "text-green"}`}
                    >
                      <FontAwesomeIcon
                        icon={faCalendarCheck}
                        className="ml-1 pr-1.5 pt-0.5 text-sm"
                      />
                      <div className="text-xs">Last Synced</div>
                    </div>
                    <div className="rounded bg-mineshaft-600 p-2 text-xs">
                      {format(new Date(lastSyncedAt), "yyyy-MM-dd, hh:mm aaa")}
                    </div>
                  </div>
                )}
                {failureMessage && (
                  <div>
                    <div className="mb-2 flex self-start text-red">
                      <FontAwesomeIcon icon={faXmark} className="ml-1 pr-1.5 pt-0.5 text-sm" />
                      <div className="text-xs">Failure Reason</div>
                    </div>
                    <div className="rounded bg-mineshaft-600 p-2 text-xs">{failureMessage}</div>
                  </div>
                )}
              </div>
            }
          >
            <div className="w-min whitespace-nowrap">
              <Badge variant={isSynced ? "success" : "danger"}>
                <div className="flex items-center space-x-1">
                  <FontAwesomeIcon icon={isSynced ? faCheck : faWarning} />
                  <div>{isSynced ? "Synced" : "Not Synced"}</div>
                </div>
              </Badge>
            </div>
          </Tooltip>
        )}
      </Td>
      <Td>
        <div className="flex gap-2 whitespace-nowrap">
          <Tooltip className="max-w-sm text-center" content="Manually Sync">
            <IconButton
              onClick={(e) => {
                e.stopPropagation();
                onTriggerSync(secretSync);
              }}
              ariaLabel="sync"
              colorSchema="secondary"
              variant="plain"
            >
              <FontAwesomeIcon icon={faRefresh} />
            </IconButton>
          </Tooltip>
          <ProjectPermissionCan
            I={ProjectPermissionActions.Delete}
            a={ProjectPermissionSub.SecretSyncs}
          >
            {(isAllowed: boolean) => (
              <Tooltip content="Remove Sync">
                <IconButton
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(secretSync);
                  }}
                  ariaLabel="delete"
                  isDisabled={!isAllowed}
                  colorSchema="danger"
                  variant="plain"
                >
                  <FontAwesomeIcon icon={faTrash} className="px-1" />
                </IconButton>
              </Tooltip>
            )}
          </ProjectPermissionCan>
        </div>
      </Td>
    </Tr>
  );
};
