import {
  faCheckCircle,
  faCircleMinus,
  faCircleXmark,
  faFolder
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { Handle, NodeProps, Position } from "@xyflow/react";

import { PermissionAccess } from "@app/components/permissions/AccessTree/types";
import { createFolderNode } from "@app/components/permissions/AccessTree/utils";
import { Tooltip } from "@app/components/v2";

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
  if (access === PermissionAccess.Full) {
    return <span className="capitalize">Full {action} Permissions</span>;
  }

  if (access === PermissionAccess.None) {
    return <span className="capitalize">No {action} Permissions</span>;
  }

  return (
    <div className="flex flex-col gap-2">
      <span className="capitalize">Conditional {action} Permissions</span>
      {actionRuleMap.map((ruleMap, index) => {
        const rule = ruleMap[action];

        if (!rule || !rule.conditions || (!rule.conditions.secretName && !rule.conditions.tags))
          return null;

        console.log("rule", rule.conditions.secretName);

        return (
          // eslint-disable-next-line react/no-array-index-key
          <div key={`${action}_${index}`}>
            <span>{rule.inverted ? "Forbid" : "Allow"}</span>
            {Boolean(rule.conditions.secretName) && (
              <p>
                Secret Name{" "}
                {Object.entries(rule.conditions.secretName as object)
                  .map(([key, value]) => `${key} ${value as string}`)
                  .join(", ")}
                .
              </p>
            )}
          </div>
        );
      })}
    </div>
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
                className="max-w-2xl"
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
