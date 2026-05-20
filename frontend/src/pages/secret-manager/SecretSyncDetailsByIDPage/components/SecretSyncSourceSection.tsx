import { AlertTriangleIcon, PencilIcon } from "lucide-react";

import { ProjectPermissionCan } from "@app/components/permissions";
import { GenericFieldLabel } from "@app/components/secret-syncs";
import {
  Badge,
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
  IconButton,
  Tooltip,
  TooltipContent,
  TooltipTrigger
} from "@app/components/v3";
import { ProjectPermissionSecretSyncActions } from "@app/context/ProjectPermissionContext/types";
import { SecretSync, TSecretSync } from "@app/hooks/api/secretSyncs";
import { getSecretSyncPermissionSubject } from "@app/lib/fn/permission";

import { AzureEntraIdScimSyncSourceSection } from "./AzureEntraIdScimSyncSourceSection";

type Props = {
  secretSync: TSecretSync;
  onEditSource: VoidFunction;
};

const DefaultSecretSyncSourceSection = ({ secretSync, onEditSource }: Props) => {
  const { folder, environment } = secretSync;

  const permissionSubject = getSecretSyncPermissionSubject(secretSync);

  return (
    <Card>
      <CardHeader className="border-b">
        <CardTitle>Source</CardTitle>
        <CardAction className="flex items-center gap-2">
          {(!folder || !environment) && (
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="inline-block">
                  <Badge variant="danger">
                    <AlertTriangleIcon />
                    Folder Deleted
                  </Badge>
                </span>
              </TooltipTrigger>
              <TooltipContent>
                The source location for this sync has been deleted. Configure a new source or remove
                this sync.
              </TooltipContent>
            </Tooltip>
          )}
          <ProjectPermissionCan I={ProjectPermissionSecretSyncActions.Edit} a={permissionSubject}>
            {(isAllowed) => (
              <IconButton
                variant="ghost-muted"
                size="xs"
                isDisabled={!isAllowed}
                aria-label="Edit sync source"
                onClick={onEditSource}
              >
                <PencilIcon />
              </IconButton>
            )}
          </ProjectPermissionCan>
        </CardAction>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <GenericFieldLabel label="Environment">{environment?.name}</GenericFieldLabel>
          <GenericFieldLabel label="Path">{folder?.path}</GenericFieldLabel>
        </div>
      </CardContent>
    </Card>
  );
};

export const SecretSyncSourceSection = ({ secretSync, onEditSource }: Props) => {
  switch (secretSync.destination) {
    case SecretSync.AzureEntraIdScim:
      return (
        <AzureEntraIdScimSyncSourceSection secretSync={secretSync} onEditSource={onEditSource} />
      );
    default:
      return <DefaultSecretSyncSourceSection secretSync={secretSync} onEditSource={onEditSource} />;
  }
};
