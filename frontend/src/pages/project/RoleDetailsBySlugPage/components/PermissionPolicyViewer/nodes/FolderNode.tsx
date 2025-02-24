import { faCheckCircle, faCircleXmark, faFolder } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { Handle, NodeProps, Position } from "@xyflow/react";

import { ProjectPermissionActions } from "@app/context";
import { createFolderNode } from "@app/pages/project/RoleDetailsBySlugPage/components/PermissionPolicyViewer/utils";

export const FolderNode = ({
  data
}: NodeProps & { data: ReturnType<typeof createFolderNode>["data"] }) => {
  const { name, actions } = data;

  const canRead = actions[ProjectPermissionActions.Read];
  const canCreate = actions[ProjectPermissionActions.Create];
  const canEdit = actions[ProjectPermissionActions.Edit];
  const canDelete = actions[ProjectPermissionActions.Delete];

  return (
    <>
      <Handle
        type="target"
        className="pointer-events-none !cursor-pointer opacity-0"
        position={Position.Top}
      />
      <div
        className={`flex ${canRead || canCreate || canEdit || canDelete ? "" : "opacity-50"} h-full w-full flex-col items-center justify-center rounded-md border border-mineshaft bg-mineshaft-800 px-2 py-2 font-inter shadow-lg`}
      >
        <div className="flex items-center space-x-2 text-xs text-mineshaft-300">
          <FontAwesomeIcon className="mb-0.5 text-yellow" icon={faFolder} />
          <span>{name !== "/" ? `/${name}` : "/"}</span>
        </div>
        <div className="mt-2 flex w-full justify-between rounded bg-mineshaft-600 px-2 py-1 text-xs">
          <div className="flex items-center gap-2">
            <FontAwesomeIcon
              icon={canRead ? faCheckCircle : faCircleXmark}
              className={canRead ? "text-green" : "text-red"}
              size="xs"
            />
            <span>Read</span>
          </div>
          <div className="flex items-center gap-2">
            <FontAwesomeIcon
              icon={canCreate ? faCheckCircle : faCircleXmark}
              className={canCreate ? "text-green" : "text-red"}
              size="xs"
            />
            <span>Create</span>
          </div>
          <div className="flex items-center gap-2">
            <FontAwesomeIcon
              icon={canEdit ? faCheckCircle : faCircleXmark}
              className={canEdit ? "text-green" : "text-red"}
              size="xs"
            />
            <span>Edit</span>
          </div>
          <div className="flex items-center gap-2">
            <FontAwesomeIcon
              icon={canDelete ? faCheckCircle : faCircleXmark}
              className={canDelete ? "text-green" : "text-red"}
              size="xs"
            />
            <span>Delete</span>
          </div>
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
