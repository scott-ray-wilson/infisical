import { useMemo } from "react";
import { format } from "date-fns";
import { PencilIcon } from "lucide-react";

import { ProjectPermissionCan } from "@app/components/permissions";
import { GenericFieldLabel, SecretSyncStatusBadge } from "@app/components/secret-syncs";
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
  IconButton
} from "@app/components/v3";
import { ProjectPermissionSecretSyncActions } from "@app/context/ProjectPermissionContext/types";
import { SecretSyncStatus, TSecretSync } from "@app/hooks/api/secretSyncs";
import { getSecretSyncPermissionSubject } from "@app/lib/fn/permission";

type Props = {
  secretSync: TSecretSync;
  onEditDetails: VoidFunction;
};

export const SecretSyncDetailsSection = ({ secretSync, onEditDetails }: Props) => {
  const { syncStatus, lastSyncMessage, lastSyncedAt, name, description } = secretSync;

  const failureMessage = useMemo(() => {
    if (syncStatus === SecretSyncStatus.Failed) {
      if (lastSyncMessage)
        try {
          return JSON.stringify(JSON.parse(lastSyncMessage), null, 2);
        } catch {
          return lastSyncMessage;
        }

      return "An Unknown Error Occurred.";
    }
    return null;
  }, [syncStatus, lastSyncMessage]);

  const permissionSubject = getSecretSyncPermissionSubject(secretSync);

  return (
    <Card>
      <CardHeader className="border-b">
        <CardTitle>Details</CardTitle>
        <CardAction>
          <ProjectPermissionCan I={ProjectPermissionSecretSyncActions.Edit} a={permissionSubject}>
            {(isAllowed) => (
              <IconButton
                variant="ghost-muted"
                size="xs"
                isDisabled={!isAllowed}
                aria-label="Edit sync details"
                onClick={onEditDetails}
              >
                <PencilIcon />
              </IconButton>
            )}
          </ProjectPermissionCan>
        </CardAction>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <GenericFieldLabel label="Name" truncate>
            {name}
          </GenericFieldLabel>
          <GenericFieldLabel label="Description">{description}</GenericFieldLabel>
          {syncStatus && (
            <GenericFieldLabel label="Status">
              <SecretSyncStatusBadge status={syncStatus} />
            </GenericFieldLabel>
          )}
          {lastSyncedAt && (
            <GenericFieldLabel label="Last Synced">
              {format(new Date(lastSyncedAt), "yyyy-MM-dd, hh:mm aaa")}
            </GenericFieldLabel>
          )}
          {syncStatus === SecretSyncStatus.Failed && failureMessage && (
            <GenericFieldLabel labelClassName="text-red" label="Last Sync Error">
              <p className="rounded-sm bg-mineshaft-600 p-2 text-xs break-words">
                {failureMessage}
              </p>
            </GenericFieldLabel>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
