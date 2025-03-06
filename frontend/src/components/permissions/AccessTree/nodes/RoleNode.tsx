import { faIdBadge } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { Handle, NodeProps, Position } from "@xyflow/react";

export const RoleNode = ({ data: { subject } }: NodeProps & { data: { subject: string } }) => {
  return (
    <>
      <Handle
        type="target"
        className="pointer-events-none !cursor-pointer opacity-0"
        position={Position.Top}
      />
      <div className="flex h-full w-full flex-col items-center justify-center rounded-md border border-mineshaft bg-mineshaft-800 px-3 py-2 font-inter shadow-lg">
        <div className="flex items-center space-x-2 text-xs text-mineshaft-300">
          <FontAwesomeIcon className="mb-0.5" icon={faIdBadge} />
          <span className="capitalize">{subject} Access</span>
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
