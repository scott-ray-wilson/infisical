import { Handle, NodeProps, Position } from "@xyflow/react";

export const EnvironmentNode = ({ data }: NodeProps & { data: any }) => {
  const { name } = data;

  return (
    <>
      <Handle
        type="target"
        className="pointer-events-none !cursor-pointer opacity-0"
        position={Position.Top}
      />
      <div className="flex h-full w-full flex-col items-center justify-center rounded-md border border-mineshaft bg-mineshaft-800 px-2 py-2 font-inter shadow-lg">
        <div className="flex items-center space-x-2 text-xs capitalize text-mineshaft-300">
          <span>{name}</span>
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
