import { subject } from "@casl/ability";
import { faCircle } from "@fortawesome/free-regular-svg-icons";
import {
  faAngleDown,
  faCheck,
  faCodeBranch,
  faEye,
  faEyeSlash,
  faFileImport,
  faKey,
  faRotate,
  faXmark
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { twMerge } from "tailwind-merge";

import { Button, Checkbox, TableContainer, Td, Tooltip, Tr } from "@app/components/v2";
import { useProjectPermission } from "@app/context";
import {
  ProjectPermissionSecretActions,
  ProjectPermissionSub
} from "@app/context/ProjectPermissionContext/types";
import { useToggle } from "@app/hooks";
import { SecretType, SecretV3RawSanitized } from "@app/hooks/api/secrets/types";
import { ProjectEnv } from "@app/hooks/api/types";
import { getExpandedRowStyle } from "@app/pages/secret-manager/OverviewPage/components/utils";
import { HIDDEN_SECRET_VALUE } from "@app/pages/secret-manager/SecretDashboardPage/components/SecretListView/SecretItem";

import { SecretEditRow } from "./SecretEditRow";
import SecretRenameRow from "./SecretRenameRow";
import {
  UnstableTable,
  UnstableTableBody,
  UnstableTableCell,
  UnstableTableHead,
  UnstableTableHeader,
  UnstableTableRow
} from "@app/components/v3";
import { CheckIcon, ChevronDown, CircleIcon, ImportIcon, KeyIcon, XIcon } from "lucide-react";
import { ReactElement } from "react";

type Props = {
  secretKey: string;
  secretPath: string;
  environments: { name: string; slug: string }[];
  isSelected: boolean;
  onToggleSecretSelect: (key: string) => void;
  getSecretByKey: (slug: string, key: string) => SecretV3RawSanitized | undefined;
  onSecretCreate: (env: string, key: string, value: string) => Promise<void>;
  onSecretUpdate: (
    env: string,
    key: string,
    value: string,
    secretValueHidden: boolean,
    type?: SecretType,
    secretId?: string
  ) => Promise<void>;
  onSecretDelete: (env: string, key: string, secretId?: string) => Promise<void>;
  isImportedSecretPresentInEnv: (env: string, secretName: string) => boolean;
  getImportedSecretByKey: (
    env: string,
    secretName: string
  ) =>
    | {
        secret?: SecretV3RawSanitized;
        secretPath: string;
        environment: string;
        environmentInfo?: ProjectEnv;
      }
    | undefined;
  scrollOffset: number;
  importedBy?: {
    environment: { name: string; slug: string };
    folders: {
      name: string;
      secrets?: { secretId: string; referencedSecretKey: string; referencedSecretEnv: string }[];
      isImported: boolean;
    }[];
  }[];
};

export const SecretOverviewTableRow = ({
  secretKey,
  environments = [],
  secretPath,
  getSecretByKey,
  onSecretUpdate,
  onSecretCreate,
  onSecretDelete,
  isImportedSecretPresentInEnv,
  getImportedSecretByKey,
  scrollOffset,
  onToggleSecretSelect,
  isSelected,
  importedBy
}: Props) => {
  const [isFormExpanded, setIsFormExpanded] = useToggle();
  const totalCols = environments.length + 1; // secret key row
  const [isSecretVisible, setIsSecretVisible] = useToggle();

  const { permission } = useProjectPermission();

  const getDefaultValue = (
    secret: SecretV3RawSanitized | undefined,
    importedSecret: { secret?: SecretV3RawSanitized } | undefined
  ) => {
    const canEditSecretValue = permission.can(
      ProjectPermissionSecretActions.Edit,
      subject(ProjectPermissionSub.Secrets, {
        environment: secret?.env || "",
        secretPath: secret?.path || "",
        secretName: secret?.key || "",
        secretTags: ["*"]
      })
    );

    if (secret?.secretValueHidden && !secret?.valueOverride) {
      return canEditSecretValue ? HIDDEN_SECRET_VALUE : "";
    }
    return secret?.valueOverride || secret?.value || importedSecret?.secret?.value || "";
  };

  return (
    <>
      <UnstableTableRow onClick={() => setIsFormExpanded.toggle()} className="group">
        <UnstableTableCell>
          <Checkbox
            id={`checkbox-${secretKey}`}
            isChecked={isSelected}
            onCheckedChange={() => {
              onToggleSecretSelect(secretKey);
            }}
            onClick={(e) => {
              e.stopPropagation();
            }}
            className={twMerge("hidden group-hover:flex", isSelected && "flex")}
          />
          {isFormExpanded ? (
            <ChevronDown
              className={twMerge(
                "block size-4 text-accent group-hover:!hidden",
                isSelected && "!hidden"
              )}
            />
          ) : (
            <KeyIcon
              className={twMerge(
                "block size-4 text-accent group-hover:!hidden",
                isSelected && "!hidden"
              )}
            />
          )}
        </UnstableTableCell>
        <UnstableTableCell>{secretKey}</UnstableTableCell>
        {environments.map(({ slug }, i) => {
          const secret = getSecretByKey(slug, secretKey);

          const isSecretImported = isImportedSecretPresentInEnv(slug, secretKey);

          const isSecretPresent = Boolean(secret);
          const isSecretEmpty = secret?.isEmpty;

          let Icon: ReactElement;

          if (isSecretPresent && !isSecretEmpty) {
            Icon = <CheckIcon className="inline-block size-4 text-success" />;
          } else if (isSecretImported) {
            Icon = <ImportIcon className="inline-block size-4 text-success" />;
          } else if (isSecretPresent && isSecretEmpty) {
            Icon = <CircleIcon className="inline-block size-4 text-warning" />;
          } else {
            Icon = <XIcon className="inline-block size-4 text-danger" />;
          }

          return (
            <UnstableTableCell
              className="border-l border-border text-center"
              key={`sec-overview-${slug}-${i + 1}-value`}
            >
              {Icon}
            </UnstableTableCell>
          );
        })}
      </UnstableTableRow>
      {isFormExpanded && (
        <UnstableTableRow className="hover:bg-transparent">
          <UnstableTableCell className="p-0" colSpan={totalCols + 1}>
            {/*<div className="ml-2 p-2" style={getExpandedRowStyle(scrollOffset)}>
              <SecretRenameRow
                secretKey={secretKey}
                environments={environments}
                secretPath={secretPath}
                getSecretByKey={getSecretByKey}
              />*/}
            <UnstableTable containerClassName="rounded-none bg-accent/5 border-none">
              <UnstableTableHeader>
                <UnstableTableRow>
                  <UnstableTableHead />
                  <UnstableTableHead>Environment</UnstableTableHead>
                  <UnstableTableHead className="border-l">Value</UnstableTableHead>
                </UnstableTableRow>
              </UnstableTableHeader>
              <UnstableTableBody>
                {environments.map(({ name, slug }) => {
                  const secret = getSecretByKey(slug, secretKey);
                  const isCreatable = !secret;

                  const isImportedSecret = isImportedSecretPresentInEnv(slug, secretKey);
                  const importedSecret = getImportedSecretByKey(slug, secretKey);

                  return (
                    <UnstableTableRow key={`secret-expanded-${slug}-${secretKey}`}>
                      <UnstableTableCell className="w-7" />
                      <UnstableTableCell className="border-r">
                        <span className="truncate">{name}</span>
                        {isImportedSecret && (
                          <Tooltip
                            content={`Imported secret from the '${importedSecret?.environmentInfo?.name}' environment`}
                          >
                            <FontAwesomeIcon icon={faFileImport} />
                          </Tooltip>
                        )}
                        {secret?.isRotatedSecret && (
                          <Tooltip content="Rotated Secret">
                            <FontAwesomeIcon icon={faRotate} />
                          </Tooltip>
                        )}
                        {secret?.idOverride && (
                          <Tooltip content="Personal Override">
                            <FontAwesomeIcon icon={faCodeBranch} />
                          </Tooltip>
                        )}
                      </UnstableTableCell>
                      <UnstableTableCell>
                        <SecretEditRow
                          secretPath={secretPath}
                          isVisible={isSecretVisible}
                          secretName={secretKey}
                          isEmpty={secret?.isEmpty}
                          secretValueHidden={secret?.secretValueHidden || false}
                          defaultValue={getDefaultValue(secret, importedSecret)}
                          secretId={secret?.id}
                          isOverride={Boolean(secret?.idOverride)}
                          isImportedSecret={isImportedSecret}
                          importedSecret={importedSecret}
                          isCreatable={isCreatable}
                          onSecretDelete={onSecretDelete}
                          onSecretCreate={onSecretCreate}
                          onSecretUpdate={onSecretUpdate}
                          environment={slug}
                          isRotatedSecret={secret?.isRotatedSecret}
                          importedBy={importedBy}
                          isSecretPresent={Boolean(secret)}
                        />
                      </UnstableTableCell>
                    </UnstableTableRow>
                  );
                })}
              </UnstableTableBody>
            </UnstableTable>
            {/*</div>*/}
          </UnstableTableCell>
        </UnstableTableRow>
      )}
    </>
  );
};
