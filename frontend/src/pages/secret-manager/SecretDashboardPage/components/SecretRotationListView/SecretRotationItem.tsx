import { subject } from "@casl/ability";
import { faAsterisk, faClose, faEdit, faRotate } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { AnimatePresence, motion } from "framer-motion";
import { twMerge } from "tailwind-merge";

import { ProjectPermissionCan } from "@app/components/permissions";
import { SecretRotationV2NextRotationBadge } from "@app/components/secret-rotations-v2/SecretRotationV2NextRotationBadge";
import { IconButton, Tag, Tooltip } from "@app/components/v2";
import { ProjectPermissionSub, useWorkspace } from "@app/context";
import { ProjectPermissionSecretRotationActions } from "@app/context/ProjectPermissionContext/types";
import { SECRET_ROTATION_MAP } from "@app/helpers/secretRotationsV2";
import { useToggle } from "@app/hooks";
import { TSecretRotationV2 } from "@app/hooks/api/secretRotationsV2";

type Props = {
  secretRotation: TSecretRotationV2;
  onEdit: () => void;
  onRotate: () => void;
  onViewGeneratedCredentials: () => void;
};

export const SecretRotationItem = ({
  secretRotation,
  onEdit,
  onRotate,
  onViewGeneratedCredentials
}: Props) => {
  const { name, type, connection, environment, folder, lastRotatedAt, interval } = secretRotation;
  const { currentWorkspace } = useWorkspace();
  const [isExpanded, setIsExpanded] = useToggle();

  const { name: rotationType, image } = SECRET_ROTATION_MAP[type];

  return (
    <>
      <div
        className={twMerge(
          "group flex cursor-pointer border-b border-mineshaft-600 hover:bg-mineshaft-700"
        )}
        role="button"
        tabIndex={0}
        onClick={setIsExpanded.toggle}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            setIsExpanded.toggle();
          }
        }}
      >
        <div className="text- flex w-11 items-center py-2 pl-5 text-mineshaft-400">
          <FontAwesomeIcon icon={faRotate} />
        </div>
        <div className="flex flex-grow items-center border-r border-mineshaft-600 py-2 pl-4 pr-2">
          {secretRotation.name}
          <Tag className="ml-4 mr-auto flex items-center gap-1 px-1.5 py-0 text-xs normal-case">
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
          <SecretRotationV2NextRotationBadge className="mr-2" secretRotation={secretRotation} />
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
        {/* <div className="flex items-center space-x-4 py-2 pr-4">
          {lastReplicated && (
            <Tooltip
              position="left"
              className="max-w-md whitespace-normal break-words"
              content={
                <div className="flex max-h-[10rem] flex-col overflow-auto">
                  <div className="flex self-start">
                    <FontAwesomeIcon icon={faCalendarCheck} className="pr-2 pt-0.5 text-sm" />
                    <div className="text-sm">Last Replication</div>
                  </div>
                  <div className="pl-5 text-left text-xs">
                    {lastReplicated
                      ? format(new Date(lastReplicated), "yyyy-MM-dd, hh:mm aaa")
                      : "-"}
                  </div>
                  {!isReplicationSuccess && (
                    <>
                      <div className="mt-2 flex self-start">
                        <FontAwesomeIcon icon={faXmark} className="pr-2 pt-1 text-sm" />
                        <div className="text-sm">Fail reason</div>
                      </div>
                      <div className="pl-5 text-left text-xs">{replicationStatus}</div>
                    </>
                  )}
                </div>
              }
            >
              <div
                className={twMerge(
                  "opacity-0 group-hover:opacity-100",
                  !isReplicationSuccess && "text-red-600"
                )}
              >
                <FontAwesomeIcon icon={isReplicationSuccess ? faInfoCircle : faWarning} />
              </div>
            </Tooltip>
          )}
          {isReplication && (
            <ProjectPermissionCan
              I={ProjectPermissionActions.Edit}
              a={subject(ProjectPermissionSub.SecretImports, { environment, secretPath })}
              renderTooltip
              allowedLabel="Resync replicated secrets"
            >
              {(isAllowed) => (
                <IconButton
                  size="md"
                  colorSchema="primary"
                  variant="plain"
                  ariaLabel="expand"
                  className={twMerge(
                    "p-0 opacity-0 group-hover:opacity-100",
                    resyncSecretReplication.isPending && "animate-spin opacity-100"
                  )}
                  isDisabled={!isAllowed}
                  onClick={handleResyncSecretReplication}
                >
                  <FontAwesomeIcon icon={faRotate} />
                </IconButton>
              )}
            </ProjectPermissionCan>
          )}
        </div> */}
        {/* <div className="flex items-center space-x-4 border-l border-mineshaft-600 px-4 py-2"> */}
        {/*  <ProjectPermissionCan */}
        {/*    I={ProjectPermissionActions.Edit} */}
        {/*    a={subject(ProjectPermissionSub.SecretImports, { */}
        {/*      environment, */}
        {/*      secretPath: secretPath || "/" */}
        {/*    })} */}
        {/*    renderTooltip */}
        {/*    allowedLabel="Change order" */}
        {/*  > */}
        {/*    {(isAllowed) => ( */}
        {/*      <IconButton */}
        {/*        size="md" */}
        {/*        colorSchema="primary" */}
        {/*        variant="plain" */}
        {/*        ariaLabel="expand" */}
        {/*        className="p-0 opacity-0 group-hover:opacity-100" */}
        {/*        {...attributes} */}
        {/*        {...listeners} */}
        {/*        isDisabled={!isAllowed} */}
        {/*      > */}
        {/*        <FontAwesomeIcon icon={faUpDown} /> */}
        {/*      </IconButton> */}
        {/*    )} */}
        {/*  </ProjectPermissionCan> */}
        {/*  <ProjectPermissionCan */}
        {/*    I={ProjectPermissionActions.Delete} */}
        {/*    a={subject(ProjectPermissionSub.SecretImports, { environment, secretPath })} */}
        {/*    renderTooltip */}
        {/*    allowedLabel="Delete" */}
        {/*  > */}
        {/*    {(isAllowed) => ( */}
        {/*      <IconButton */}
        {/*        size="md" */}
        {/*        variant="plain" */}
        {/*        colorSchema="danger" */}
        {/*        ariaLabel="delete" */}
        {/*        className="p-0 opacity-0 group-hover:opacity-100" */}
        {/*        onClick={(evt) => { */}
        {/*          evt.stopPropagation(); */}
        {/*          onDelete(); */}
        {/*        }} */}
        {/*        isDisabled={!isAllowed} */}
        {/*      > */}
        {/*        <FontAwesomeIcon icon={faClose} size="lg" /> */}
        {/*      </IconButton> */}
        {/*    )} */}
        {/*  </ProjectPermissionCan> */}
        {/* </div> */}
      </div>
      {/* {isExpanded && ( */}
      {/*  <td */}
      {/*    colSpan={3} */}
      {/*    className={`bg-bunker-800 ${isExpanded && "border-b-2 border-mineshaft-500"}`} */}
      {/*  > */}
      {/*    <div className="rounded-md bg-bunker-700 p-1"> */}
      {/*      <TableContainer> */}
      {/*        <table className="secret-table"> */}
      {/*          <thead> */}
      {/*            <tr> */}
      {/*              <td style={{ padding: "0.25rem 1rem" }}>Key</td> */}
      {/*              <td style={{ padding: "0.25rem 1rem" }}>Value</td> */}
      {/*              /!* <td style={{ padding: "0.25rem 1rem" }}>Override</td> *!/ */}
      {/*            </tr> */}
      {/*          </thead> */}
      {/*          <tbody> */}
      {/*            {importedSecrets?.length === 0 && ( */}
      {/*              <tr> */}
      {/*                <td colSpan={3}> */}
      {/*                  <EmptyState title="No secrets found" icon={faKey} /> */}
      {/*                </td> */}
      {/*              </tr> */}
      {/*            )} */}
      {/*            {importedSecrets */}
      {/*              .filter((secret) => secret.key.toUpperCase().includes(searchTerm.toUpperCase())) */}
      {/*              .map(({ key, value }, index) => ( */}
      {/*                <tr key={`${id}-${key}-${index + 1}`}> */}
      {/*                  <td className="h-10" style={{ padding: "0.25rem 1rem" }}> */}
      {/*                    {key} */}
      {/*                  </td> */}
      {/*                  <td className="h-10" style={{ padding: "0.25rem 1rem" }}> */}
      {/*                    <SecretInput value={value} isReadOnly /> */}
      {/*                  </td> */}
      {/*                  /!* <td className="h-10" style={{ padding: "0.25rem 1rem" }}> */}
      {/*                    <EnvFolderIcon env={overriden?.env} secretPath={overriden?.secretPath} /> */}
      {/*                  </td> *!/ */}
      {/*                </tr> */}
      {/*              ))} */}
      {/*          </tbody> */}
      {/*        </table> */}
      {/*      </TableContainer> */}
      {/*    </div> */}
      {/*  </td> */}
      {/* )} */}
    </>
  );
};
