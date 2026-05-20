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
import { useProject } from "@app/context";
import { ProjectPermissionSecretSyncActions } from "@app/context/ProjectPermissionContext/types";
import { useGetProjectSecrets } from "@app/hooks/api/secrets/queries";
import { TSecretSync } from "@app/hooks/api/secretSyncs";
import { TAzureEntraIdScimSync } from "@app/hooks/api/secretSyncs/types/azure-entra-id-scim-sync";
import { getSecretSyncPermissionSubject } from "@app/lib/fn/permission";

type Props = {
  secretSync: TSecretSync;
  onEditSource: VoidFunction;
};

export const AzureEntraIdScimSyncSourceSection = ({ secretSync, onEditSource }: Props) => {
  const { folder, environment } = secretSync;
  const { currentProject } = useProject();

  const scimSync = secretSync as TAzureEntraIdScimSync;
  const secretId = scimSync.syncOptions?.secretId;

  const { data: secrets } = useGetProjectSecrets({
    projectId: currentProject.id,
    environment: environment?.slug ?? "",
    secretPath: folder?.path ?? "/",
    viewSecretValue: false,
    options: {
      enabled: Boolean(secretId && environment?.slug && folder?.path)
    }
  });

  const secretName = secretId ? secrets?.find((s) => s.id === secretId)?.key : undefined;

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
          {secretName && <GenericFieldLabel label="Secret">{secretName}</GenericFieldLabel>}
        </div>
      </CardContent>
    </Card>
  );
};
