import { ReactElement } from "react";
import {
  faCheckCircle,
  faCircleMinus,
  faCircleXmark,
  faFolder
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { Handle, NodeProps, NodeToolbar, Position } from "@xyflow/react";

import { PermissionAccess } from "@app/components/permissions/AccessTree/types";
import { createFolderNode } from "@app/components/permissions/AccessTree/utils";
import { Tooltip } from "@app/components/v2";
import {
  formatedConditionsOperatorNames,
  PermissionConditionOperators
} from "@app/context/ProjectPermissionContext/types";
import { camelCaseToSpaces } from "@app/helpers/string";

const AccessMap = {
  [PermissionAccess.Full]: { className: "text-green", icon: faCheckCircle },
  [PermissionAccess.Partial]: { className: "text-yellow", icon: faCircleMinus },
  [PermissionAccess.None]: { className: "text-red", icon: faCircleXmark }
};

type Props = {
  action: string;
  access: PermissionAccess;
  actionRuleMap: ReturnType<typeof createFolderNode>["data"]["actionRuleMap"];
};

const TooltipContent = ({ action, access, actionRuleMap }: Props) => {
  let component: ReactElement;

  switch (access) {
    case PermissionAccess.Full:
      component = (
        <>
          <div className="flex items-center gap-1.5 capitalize text-green">
            <FontAwesomeIcon icon={faCheckCircle} size="xs" />
            <span>Full {action} Permissions</span>
          </div>
          <p>Policy grants unconditional {action} permissions to this location.</p>
        </>
      );
      break;
    case PermissionAccess.Partial:
      component = (
        <>
          <div className="flex items-center gap-1.5 font-medium capitalize text-yellow">
            <FontAwesomeIcon icon={faCircleMinus} className="text-yellow" size="xs" />
            <span>Conditional {action} Permissions</span>
          </div>
          <p className="mb-1">Policy conditional allows {action} permissions to this location.</p>
          <ul className="flex list-disc flex-col gap-2 pl-4">
            {actionRuleMap.map((ruleMap, index) => {
              const rule = ruleMap[action];

              if (
                !rule ||
                !rule.conditions ||
                (!rule.conditions.secretName && !rule.conditions.secretTags)
              )
                return null;

              return (
                <li key={`${action}_${index + 1}`}>
                  <span
                    className={`font-medium italic ${rule.inverted ? "text-red" : "text-green"} `}
                  >
                    {rule.inverted ? "Forbids" : "Allows"}
                  </span>
                  <span> when:</span>
                  {Object.entries(rule.conditions).map(([key, condition]) => (
                    <ul key={key} className="list-[square] pl-4">
                      {Object.entries(condition as object).map(([operator, value]) => (
                        <li>
                          <span className="font-medium capitalize text-mineshaft-100">
                            {camelCaseToSpaces(key)}
                          </span>{" "}
                          <span className="text-mineshaft-200">
                            {
                              formatedConditionsOperatorNames[
                                operator as PermissionConditionOperators
                              ]
                            }
                          </span>{" "}
                          <span className="font-medium text-mineshaft-100">
                            {typeof value === "string" ? value : value.join(", ")}
                          </span>
                          .
                        </li>
                      ))}
                    </ul>
                  ))}
                </li>
              );
            })}
          </ul>
        </>
      );
      break;
    case PermissionAccess.None:
      component = (
        <>
          <div className="flex items-center gap-1.5 capitalize text-red">
            <FontAwesomeIcon icon={faCircleXmark} size="xs" />
            <span>No {action} Permissions</span>
          </div>
          <p>Policy always forbids {action} permissions to this location.</p>
        </>
      );
      break;
    default:
      throw new Error(`Unhandled access type: ${access}`);
  }

  return (
    <NodeToolbar
      className="rounded-md border border-mineshaft-600 bg-mineshaft-800 px-4 py-2 text-sm font-light text-bunker-200"
      isVisible
      position={Position.Bottom}
    >
      {component}
    </NodeToolbar>
  );
};

export const FolderNode = ({
  data
}: NodeProps & { data: ReturnType<typeof createFolderNode>["data"] }) => {
  const { name, actions, actionRuleMap } = data;

  return (
    <>
      <Handle
        type="target"
        className="pointer-events-none !cursor-pointer opacity-0"
        position={Position.Top}
      />
      <div
        className={`flex ${Object.values(actions).some((action) => action === PermissionAccess.Full || action === PermissionAccess.Partial) ? "" : "opacity-40"} h-full w-full flex-col items-center justify-center rounded-md border border-mineshaft bg-mineshaft-800 px-2 py-2 font-inter shadow-lg transition-opacity duration-500`}
      >
        <div className="flex items-center space-x-2 text-xs text-mineshaft-300">
          <FontAwesomeIcon className="mb-0.5 text-yellow" icon={faFolder} />
          <span>{name !== "/" ? `/${name}` : "/"}</span>
        </div>
        <div className="mt-2 flex w-full justify-between rounded bg-mineshaft-600 px-2 py-1 text-xs">
          {Object.entries(actions).map(([action, access]) => {
            const { className, icon } = AccessMap[access];
            return (
              <Tooltip
                className="hidden" // just using the tooltip to trigger node toolbar
                content={
                  <TooltipContent action={action} access={access} actionRuleMap={actionRuleMap} />
                }
              >
                <div className="flex items-center gap-1">
                  <FontAwesomeIcon icon={icon} className={className} size="xs" />
                  <span className="capitalize">{action}</span>
                </div>
              </Tooltip>
            );
          })}
        </div>
      </div>
      <Handle
        type="source"
        className="pointer-events-none !cursor-pointer opacity-0"
        position={Position.Bottom}
      />
    </>
  );
};
