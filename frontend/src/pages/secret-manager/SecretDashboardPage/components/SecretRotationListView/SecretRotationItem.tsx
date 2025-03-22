import { subject } from "@casl/ability";
import { faAsterisk, faClose, faEdit, faRotate } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { AnimatePresence, motion } from "framer-motion";
import { twMerge } from "tailwind-merge";

import { ProjectPermissionCan } from "@app/components/permissions";
import { SecretRotationV2NextRotationBadge } from "@app/components/secret-rotations-v2/SecretRotationV2NextRotationBadge";
import { IconButton, Tag, Tooltip } from "@app/components/v2";
import { ProjectPermissionSub } from "@app/context";
import { ProjectPermissionSecretRotationActions } from "@app/context/ProjectPermissionContext/types";
import { SECRET_ROTATION_MAP } from "@app/helpers/secretRotationsV2";
import { TSecretRotationV2 } from "@app/hooks/api/secretRotationsV2";
import { SecretV3RawSanitized } from "@app/hooks/api/secrets/types";
import { WsTag } from "@app/hooks/api/tags/types";
import {
  SecretListView,
  SecretNoAccessListView
} from "@app/pages/secret-manager/SecretDashboardPage/components/SecretListView";

type Props = {
  secretRotation: TSecretRotationV2;
  onEdit: () => void;
  onRotate: () => void;
  onViewGeneratedCredentials: () => void;
  tags?: WsTag[];
  isVisible?: boolean;
  isProtectedBranch?: boolean;
};

export const SecretRotationItem = ({
  secretRotation,
  onEdit,
  onRotate,
  onViewGeneratedCredentials,
  ...secretProps
}: Props) => {
  const {
    name,
    type,
    connection,
    environment,
    folder,
    lastRotatedAt,
    interval,
    projectId,
    secrets
  } = secretRotation;

  const { name: rotationType, image } = SECRET_ROTATION_MAP[type];

  return (
    <>
      <div
        className={twMerge(
          "group flex cursor-pointer border-b border-mineshaft-600 hover:bg-mineshaft-700"
        )}
        role="button"
        tabIndex={0}
      >
        <div className="text- flex w-11 items-center py-2 pl-5 text-mineshaft-400">
          <FontAwesomeIcon icon={faRotate} />
        </div>
        <div className="flex flex-grow items-center border-r border-mineshaft-600 py-2 pl-4 pr-2">
          <div className="flex w-full flex-wrap items-center gap-x-4">
            <span>{secretRotation.name}</span>
            <Tag className="flex items-center gap-1 px-1.5 py-0 text-xs normal-case">
              <img
                src={`/images/integrations/${image}`}
                style={{
                  height: "11px",
                  width: "11px"
                }}
                alt={`${rotationType} logo`}
              />
              {rotationType}
            </Tag>
          </div>
          <SecretRotationV2NextRotationBadge className="mx-2" secretRotation={secretRotation} />
          <div
            key="actions"
            className="flex h-full flex-shrink-0 self-start transition-all group-hover:gap-x-2"
          >
            <ProjectPermissionCan
              I={ProjectPermissionSecretRotationActions.ReadCredentials}
              a={subject(ProjectPermissionSub.SecretRotation, {
                environment: environment.slug,
                secretPath: folder.path
              })}
              renderTooltip
              allowedLabel="View Generated Credentials"
            >
              {(isAllowed) => (
                <IconButton
                  ariaLabel="view-generated-credentials"
                  variant="plain"
                  size="sm"
                  isDisabled={!isAllowed}
                  className="w-0 overflow-hidden p-0 group-hover:w-5"
                  onClick={onViewGeneratedCredentials}
                >
                  <FontAwesomeIcon icon={faAsterisk} />
                </IconButton>
              )}
            </ProjectPermissionCan>
            <ProjectPermissionCan
              I={ProjectPermissionSecretRotationActions.Rotate}
              a={subject(ProjectPermissionSub.SecretRotation, {
                environment: environment.slug,
                secretPath: folder.path
              })}
              renderTooltip
              allowedLabel="Rotate Secrets"
            >
              {(isAllowed) => (
                <IconButton
                  ariaLabel="rotate-secrets"
                  variant="plain"
                  size="sm"
                  isDisabled={!isAllowed}
                  className="w-0 overflow-hidden p-0 group-hover:w-5"
                  onClick={onRotate}
                >
                  <FontAwesomeIcon icon={faRotate} />
                </IconButton>
              )}
            </ProjectPermissionCan>
          </div>
        </div>
        <AnimatePresence mode="wait">
          <motion.div
            key="options"
            className="flex h-10 flex-shrink-0 items-center space-x-1 px-[0.665rem]"
            initial={{ x: 0, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 10, opacity: 0 }}
          >
            <Tooltip content="Edit">
              <IconButton
                ariaLabel="more"
                variant="plain"
                size="md"
                className="opacity-0 group-hover:opacity-100"
                onClick={onEdit}
              >
                <FontAwesomeIcon icon={faEdit} />
              </IconButton>
            </Tooltip>
            <ProjectPermissionCan
              I={ProjectPermissionSecretRotationActions.Delete}
              a={subject(ProjectPermissionSub.SecretRotation, {
                environment: environment.slug,
                secretPath: folder.path
              })}
              renderTooltip
              allowedLabel="Delete"
            >
              {(isAllowed) => (
                <IconButton
                  ariaLabel="delete-value"
                  variant="plain"
                  colorSchema="danger"
                  size="md"
                  className="opacity-0 group-hover:opacity-100"
                  // onClick={() => onDeleteSecret(secret)}
                  isDisabled={!isAllowed}
                >
                  <FontAwesomeIcon icon={faClose} size="lg" />
                </IconButton>
              )}
            </ProjectPermissionCan>
          </motion.div>
        </AnimatePresence>
      </div>
      <SecretListView
        isRotationView
        secrets={secrets.filter((secret) => Boolean(secret)) as SecretV3RawSanitized[]}
        environment={environment.slug}
        workspaceId={projectId}
        secretPath={folder.path}
        {...secretProps}
      />
      <SecretNoAccessListView count={secrets.filter((secret) => !secret).length} />
    </>
  );
};
