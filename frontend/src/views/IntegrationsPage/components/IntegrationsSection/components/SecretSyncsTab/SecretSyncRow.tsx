import { useMemo } from "react";
import { useRouter } from "next/router";
import {
  faCalendarCheck,
  faCheck,
  faRefresh,
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

type Props = {
  secretSync: TSecretSync;
};

export const SecretSyncRow = ({ secretSync }: Props) => {
  const router = useRouter();

  const {
    id,
    secretPath,
    lastSyncMessage,
    isSynced,
    destination,

    lastSyncedAt,
    environment
  } = secretSync;

  const failureMessage = useMemo(() => {
    if (isSynced === false) {
      if (lastSyncMessage)
        try {
          return JSON.stringify(JSON.parse(lastSyncMessage), null, 2);
        } catch (e) {
          return lastSyncMessage;
        }

      return "An Unknown Error Occurred.";
    }
    return null;
  }, [isSynced, lastSyncMessage]);

  const destinationDetails = SECRET_SYNC_MAP[destination];

  return (
    <Tr
      onClick={() => router.push(`/integrations/secret-syncs/${id}`)}
      className={twMerge(
        "group h-10 cursor-pointer transition-colors duration-100 hover:bg-mineshaft-700",
        isSynced === false && "bg-red/5 hover:bg-red/10"
      )}
      key={`integration-${id}`}
    >
      <Td>
        <div className="flex items-center gap-2">
          <img
            alt={`${destinationDetails.name} sync`}
            src={`/images/integrations/${destinationDetails.image}`}
            className="h-5 w-5"
          />
          <span className="hidden lg:inline">{destinationDetails.name}</span>
        </div>
      </Td>
      <Td className="!min-w-[8rem] max-w-0">
        <Tooltip side="top" className="max-w-2xl break-words" content={secretPath}>
          <p className="truncate">{secretPath}</p>
        </Tooltip>{" "}
      </Td>
      <Td>{environment.name}</Td>
      <Td className="!min-w-[5rem] max-w-0">
        <div className="flex items-center gap-2">
          {/* <p className="truncate">{getIntegrationDestination(integration)}</p> */}
          {/* <Tooltip */}
          {/*  position="left" */}
          {/*  className="min-w-[20rem] max-w-lg" */}
          {/*  content={<IntegrationDetails integration={integration} />} */}
          {/* > */}
          {/*  <FontAwesomeIcon icon={faInfoCircle} className="text-mineshaft-400" /> */}
          {/* </Tooltip> */}
        </div>
      </Td>
      <Td>
        {typeof isSynced !== "boolean" ? (
          <Badge variant="primary">Pending Sync</Badge>
        ) : (
          <Tooltip
            position="left"
            className="max-w-sm"
            content={
              <div className="flex flex-col gap-2 py-1">
                {lastSyncedAt && (
                  <div>
                    <div
                      className={`mb-2 flex self-start ${!isSynced ? "text-yellow" : "text-green"}`}
                    >
                      <FontAwesomeIcon
                        icon={faCalendarCheck}
                        className="ml-1 pt-0.5 pr-1.5 text-sm"
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
                      <FontAwesomeIcon icon={faXmark} className="ml-1 pt-0.5 pr-1.5 text-sm" />
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
                // onManualSyncIntegration();
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
              <Tooltip content="Remove Integration">
                <IconButton
                  onClick={(e) => {
                    e.stopPropagation();
                    // onRemoveIntegration();
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
