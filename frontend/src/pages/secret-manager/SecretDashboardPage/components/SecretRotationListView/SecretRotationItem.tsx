import { subject } from "@casl/ability";
import {
  faAsterisk,
  faChevronDown,
  faClose,
  faEdit,
  faRotate
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { AnimatePresence, motion } from "framer-motion";
import { twMerge } from "tailwind-merge";

import { ProjectPermissionCan } from "@app/components/permissions";
import { SecretRotationV2StatusBadge } from "@app/components/secret-rotations-v2/SecretRotationV2StatusBadge";
import { IconButton, Tag } from "@app/components/v2";
import { ProjectPermissionSub } from "@app/context";
import { ProjectPermissionSecretRotationActions } from "@app/context/ProjectPermissionContext/types";
import { SECRET_ROTATION_MAP } from "@app/helpers/secretRotationsV2";
import { useToggle } from "@app/hooks";
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
  onDelete: () => void;
  tags?: WsTag[];
  isVisible?: boolean;
  isProtectedBranch?: boolean;
};

export const SecretRotationItem = ({
  secretRotation,
  onEdit,
  onRotate,
  onViewGeneratedCredentials,
  onDelete,
  ...secretProps
}: Props) => {
  const { name, type, environment, folder, projectId, secrets } = secretRotation;

  const { name: rotationType, image } = SECRET_ROTATION_MAP[type];
  const [isExpanded, setIsExpanded] = useToggle(true);

  return (
    <>
      <div
        role="button"
        onClick={() => {
          setIsExpanded.toggle();
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            setIsExpanded.toggle();
          }
        }}
        className={twMerge(
          "group flex cursor-pointer border-b border-mineshaft-600 hover:bg-mineshaft-700"
        )}
        tabIndex={0}
      >
        <div className="text- flex w-11 items-center py-2 pl-5 text-mineshaft-400">
          <FontAwesomeIcon icon={isExpanded ? faChevronDown : faRotate} />
        </div>
        <div className="flex flex-grow items-center border-r border-mineshaft-600 py-2 pl-4 pr-2">
          <div className="flex w-full flex-wrap items-center gap-x-4">
            <span>{name}</span>
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
          <SecretRotationV2StatusBadge className="mx-2" secretRotation={secretRotation} />
          <div
            key="actions"
            className="flex h-full flex-shrink-0 self-start transition-all group-hover:gap-x-2"
          >
            <ProjectPermissionCan
              I={ProjectPermissionSecretRotationActions.ReadGeneratedCredentials}
              a={subject(ProjectPermissionSub.SecretRotation, {
                environment: environment.slug,
                secretPath: folder.path
              })}
              renderTooltip
              allowedLabel="View Generated Credentials"
            >
              {(isAllowed) => (
                <IconButton
                  ariaLabel="View generated credentials"
                  variant="plain"
                  size="sm"
                  isDisabled={!isAllowed}
                  className="w-0 overflow-hidden p-0 group-hover:w-5"
                  onClick={(e) => {
                    e.stopPropagation();
                    onViewGeneratedCredentials();
                  }}
                >
                  <FontAwesomeIcon icon={faAsterisk} />
                </IconButton>
              )}
            </ProjectPermissionCan>
            <ProjectPermissionCan
              I={ProjectPermissionSecretRotationActions.RotateSecrets}
              a={subject(ProjectPermissionSub.SecretRotation, {
                environment: environment.slug,
                secretPath: folder.path
              })}
              renderTooltip
              allowedLabel="Rotate Secrets"
            >
              {(isAllowed) => (
                <IconButton
                  ariaLabel="Rotate secrets"
                  variant="plain"
                  size="sm"
                  isDisabled={!isAllowed}
                  className="w-0 overflow-hidden p-0 group-hover:w-5"
                  onClick={(e) => {
                    e.stopPropagation();
                    onRotate();
                  }}
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
            <ProjectPermissionCan
              I={ProjectPermissionSecretRotationActions.Edit}
              a={subject(ProjectPermissionSub.SecretRotation, {
                environment: environment.slug,
                secretPath: folder.path
              })}
              renderTooltip
              allowedLabel="Edit"
            >
              {(isAllowed) => (
                <IconButton
                  ariaLabel="Edit rotation"
                  variant="plain"
                  size="md"
                  isDisabled={!isAllowed}
                  className="opacity-0 group-hover:opacity-100"
                  onClick={(e) => {
                    e.stopPropagation();
                    onEdit();
                  }}
                >
                  <FontAwesomeIcon icon={faEdit} />
                </IconButton>
              )}
            </ProjectPermissionCan>
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
                  ariaLabel="Delete rotation"
                  variant="plain"
                  colorSchema="danger"
                  size="md"
                  className="opacity-0 group-hover:opacity-100"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete();
                  }}
                  isDisabled={!isAllowed}
                >
                  <FontAwesomeIcon icon={faClose} size="lg" />
                </IconButton>
              )}
            </ProjectPermissionCan>
          </motion.div>
        </AnimatePresence>
      </div>
      {isExpanded && (
        <>
          <SecretListView
            secrets={secrets.filter((secret) => Boolean(secret)) as SecretV3RawSanitized[]}
            environment={environment.slug}
            workspaceId={projectId}
            secretPath={folder.path}
            {...secretProps}
          />
          <SecretNoAccessListView
            isRotationView
            count={secrets.filter((secret) => !secret).length}
          />
        </>
      )}
    </>
  );
};
