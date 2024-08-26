import { faBank, faEllipsisV } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { Handle, NodeProps, Position } from "@xyflow/react";

import { Badge, IconButton } from "@app/components/v2";
import { getCaStatusBadgeVariant } from "@app/hooks/api/ca/constants";
import { TCertificateAuthority } from "@app/hooks/api/ca/types";

export const CaNode = ({ data }: NodeProps & { data: TCertificateAuthority }) => {
  const { type, friendlyName, status } = data;

  return (
    <>
      <Handle
        type="target"
        className="pointer-events-none !cursor-pointer opacity-0"
        position={Position.Top}
      />
      <div className="flex h-full w-full flex-col items-center justify-center rounded-md border border-mineshaft bg-mineshaft-800 px-3 py-2 font-inter shadow-lg">
        <div
          className={`flex items-center space-x-1 text-xs ${
            type === "root" ? "text-green/75" : "text-blue-400/75"
          }`}
        >
          <FontAwesomeIcon size="sm" icon={faBank} />
          <span className="text-xs capitalize">{`${type} CA`}</span>
        </div>
        <span className="mt-0.5 font-inter text-xs text-mineshaft-200">{friendlyName}</span>
        <span className=" text-xs text-mineshaft-400">2034-08-24</span>
        <Badge className="mt-1 w-min capitalize" variant={getCaStatusBadgeVariant(status)}>
          {status}
        </Badge>
      </div>

      <IconButton className="absolute top-2 right-2" variant="plain" ariaLabel="Options">
        <FontAwesomeIcon icon={faEllipsisV} />
      </IconButton>
      <Handle
        type="source"
        className="pointer-events-none !cursor-pointer opacity-0"
        position={Position.Bottom}
      />
    </>
  );
};
