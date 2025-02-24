import { faFolder } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { Handle, NodeProps, Position } from "@xyflow/react";

import { TSecretFolder } from "@app/hooks/api/secretFolders/types";

export const FolderNode = ({ data }: NodeProps & { data: TSecretFolder }) => {
  const { name } = data;

  return (
    <>
      <Handle
        type="target"
        className="pointer-events-none !cursor-pointer opacity-0"
        position={Position.Top}
      />
      <div className="flex h-full w-full flex-col items-center justify-center rounded-md border border-mineshaft bg-mineshaft-800 px-3 py-2 font-inter shadow-lg">
        <div className="flex items-center space-x-2 text-mineshaft-300">
          <FontAwesomeIcon className="mb-0.5 text-yellow" icon={faFolder} />
          <span>{name !== "/" ? `/${name}` : "/"}</span>
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
