import { subject } from "@casl/ability";
import { faCircle } from "@fortawesome/free-regular-svg-icons";
import {
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

import { Button, TableContainer, Td, Tooltip, Tr } from "@app/components/v2";
import { useProjectPermission } from "@app/context";
import {
  ProjectPermissionSecretActions,
  ProjectPermissionSub
} from "@app/context/ProjectPermissionContext/types";
import { useToggle } from "@app/hooks";
import { SecretV3RawSanitized } from "@app/hooks/api/secrets/types";
import { WorkspaceEnv } from "@app/hooks/api/types";
import { ResourceNameCell } from "@app/pages/secret-manager/SecretDashboardPage/components/CompareEnvironments/components/shared";
import { HIDDEN_SECRET_VALUE } from "@app/pages/secret-manager/SecretDashboardPage/components/SecretListView/SecretItem";

import { SecretEditRow } from "./SecretEditRow";

type Props = {
  secretKey: string;
  secretPath: string;
  environments: { name: string; slug: string }[];
  getSecretByKey: (slug: string, key: string) => SecretV3RawSanitized | undefined;
  isImportedSecretPresentInEnv: (env: string, secretName: string) => boolean;
  getImportedSecretByKey: (
    env: string,
    secretName: string
  ) => { secret?: SecretV3RawSanitized; environmentInfo?: WorkspaceEnv } | undefined;
  colWidth: number;
};

export const SecretRow = ({
  secretKey,
  environments = [],
  secretPath,
  getSecretByKey,
  isImportedSecretPresentInEnv,
  getImportedSecretByKey,
  colWidth
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
      <Tr
        isHoverable
        isSelectable
        onClick={() => setIsFormExpanded.toggle()}
        className="group border-mineshaft-500"
      >
        <ResourceNameCell
          colWidth={colWidth}
          name={secretKey}
          icon={faKey}
          iconClassName="text-bunker-300"
          isRowExpanded={isFormExpanded}
        />
        {environments.map(({ slug }, i) => {
          const secret = getSecretByKey(slug, secretKey);

          const isSecretImported = isImportedSecretPresentInEnv(slug, secretKey);

          const isSecretPresent = Boolean(secret);
          const isSecretEmpty = secret?.value === "";
          return (
            <Td
              key={`sec-overview-${slug}-${i + 1}-value`}
              className={twMerge(
                "border-mineshaft-500 px-0 py-3 group-hover:bg-mineshaft-600",
                isFormExpanded && "border-t-2 border-mineshaft-500",
                i < environments.length - 1 && "border-r",
                (isSecretPresent && !isSecretEmpty) || isSecretImported ? "text-green-600" : "",
                isSecretPresent && isSecretEmpty && !isSecretImported ? "text-mineshaft-400" : "",
                !isSecretPresent && !isSecretEmpty && !isSecretImported ? "text-red-600" : ""
              )}
            >
              <div className="mx-auto flex w-[0.03rem] justify-center">
                <div className="flex justify-center">
                  {!isSecretEmpty && (
                    <Tooltip
                      center
                      content={
                        // eslint-disable-next-line no-nested-ternary
                        isSecretPresent
                          ? "Present secret"
                          : isSecretImported
                            ? "Imported secret"
                            : "Missing secret"
                      }
                    >
                      <FontAwesomeIcon
                        className={isSecretPresent || isSecretImported ? "h-3 w-3" : "h-3.5 w-3.5"}
                        // eslint-disable-next-line no-nested-ternary
                        icon={isSecretPresent ? faCheck : isSecretImported ? faFileImport : faXmark}
                      />
                    </Tooltip>
                  )}
                  {isSecretEmpty && (
                    <Tooltip content="Empty value">
                      <FontAwesomeIcon icon={faCircle} className="h-3 w-3 text-yellow" />
                    </Tooltip>
                  )}
                </div>
              </div>
            </Td>
          );
        })}
      </Tr>
      {isFormExpanded && (
        <Tr>
          <Td
            colSpan={totalCols}
            className={`bg-bunker-600 px-0 py-0 ${
              isFormExpanded && "border-b-2 border-mineshaft-500"
            }`}
          >
            <div className="ml-2 p-2">
              <TableContainer>
                <table className="secret-table">
                  <thead>
                    <tr className="h-10 border-b-2 border-mineshaft-600">
                      <th
                        style={{ padding: "0.5rem 1rem" }}
                        className="min-table-row min-w-[11rem]"
                      >
                        Environment
                      </th>
                      <th style={{ padding: "0.5rem 1rem" }} className="border-none">
                        Value
                      </th>
                      <div className="absolute right-0 top-0 ml-auto mr-1 mt-1 w-min">
                        <Button
                          variant="outline_bg"
                          className="p-1"
                          leftIcon={<FontAwesomeIcon icon={isSecretVisible ? faEyeSlash : faEye} />}
                          onClick={() => setIsSecretVisible.toggle()}
                        >
                          {isSecretVisible ? "Hide Values" : "Reveal Values"}
                        </Button>
                      </div>
                    </tr>
                  </thead>
                  <tbody className="border-t-2 border-mineshaft-600">
                    {environments.map(({ name, slug }) => {
                      const secret = getSecretByKey(slug, secretKey);
                      const isCreatable = !secret;

                      const isImportedSecret = isImportedSecretPresentInEnv(slug, secretKey);
                      const importedSecret = getImportedSecretByKey(slug, secretKey);

                      return (
                        <tr
                          key={`secret-expanded-${slug}-${secretKey}`}
                          className="hover:bg-mineshaft-700"
                        >
                          <td
                            className="flex h-full items-center"
                            style={{ padding: "0.25rem 1rem" }}
                          >
                            <div title={name} className="flex h-8 w-[8rem] items-center space-x-2">
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
                              {secret?.valueOverride && (
                                <Tooltip content="Personal Override">
                                  <FontAwesomeIcon icon={faCodeBranch} />
                                </Tooltip>
                              )}
                            </div>
                          </td>
                          <td className="col-span-2 h-8 w-full">
                            <SecretEditRow
                              secretPath={secretPath}
                              isVisible={isSecretVisible}
                              secretName={secretKey}
                              secretValueHidden={secret?.secretValueHidden || false}
                              defaultValue={getDefaultValue(secret, importedSecret)}
                              secretId={secret?.id}
                              isOverride={Boolean(secret?.valueOverride)}
                              isImportedSecret={isImportedSecret}
                              isCreatable={isCreatable}
                              environment={slug}
                              isRotatedSecret={secret?.isRotatedSecret}
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </TableContainer>
            </div>
          </Td>
        </Tr>
      )}
    </>
  );
};
