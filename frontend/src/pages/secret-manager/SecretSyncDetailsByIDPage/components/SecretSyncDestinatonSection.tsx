import { faEdit } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

import { ProjectPermissionCan } from "@app/components/permissions";
import { Badge, IconButton } from "@app/components/v2";
import { ProjectPermissionActions, ProjectPermissionSub } from "@app/context";
import { AWS_REGIONS } from "@app/helpers/appConnections";
import { TSecretSync } from "@app/hooks/api/secretSyncs";

type Props = {
  secretSync: TSecretSync;
  onEditDestination: VoidFunction;
};

export const SecretSyncDestinationSection = ({ secretSync, onEditDestination }: Props) => {
  const { syncStatus, lastSyncMessage, lastSyncedAt, name, description, destinationConfig } =
    secretSync;

  const region = AWS_REGIONS.find((r) => r.slug === destinationConfig.region);

  return (
    <div className="flex w-full flex-col gap-3 rounded-lg border border-mineshaft-600 bg-mineshaft-900 px-4 py-3">
      <div className="flex items-center justify-between border-b border-mineshaft-400 pb-2">
        <h3 className="font-semibold text-mineshaft-100">Destination Configuration</h3>
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
              onClick={onEditDestination}
            >
              <FontAwesomeIcon icon={faEdit} />
            </IconButton>
          )}
        </ProjectPermissionCan>
      </div>

      <div className="flex w-full gap-8">
        <div>
          <p className="text-xs font-medium text-mineshaft-400">Region</p>
          <p className="text-sm text-mineshaft-100">
            {region?.name}
            <Badge className="ml-1" variant="success">
              {region?.slug}{" "}
            </Badge>
          </p>
        </div>
        <div>
          <p className="text-xs font-medium text-mineshaft-400">Path</p>
          <p className="text-sm text-mineshaft-100">{destinationConfig.path}</p>
        </div>
      </div>
    </div>
  );
};
