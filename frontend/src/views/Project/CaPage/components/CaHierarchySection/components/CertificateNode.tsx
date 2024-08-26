import { faCertificate } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { Handle, NodeProps, Position } from "@xyflow/react";

import { Badge } from "@app/components/v2";
import { TCertificate } from "@app/hooks/api/certificates/types";

export const CertificateNode = ({ data }: NodeProps & { data: TCertificate }) => {
  const { friendlyName } = data;

  return (
    <>
      <Handle
        type="target"
        className="pointer-events-none !cursor-pointer opacity-0"
        position={Position.Top}
      />
      <div className="flex h-full w-full flex-col items-center justify-center rounded-md border border-yellow/40 bg-mineshaft-800 px-3 py-2 font-inter shadow-lg">
        <div className="flex items-center space-x-1 text-xs text-yellow/75">
          <FontAwesomeIcon size="sm" icon={faCertificate} />
          <span className="text-xs capitalize">Certificate</span>
        </div>
        <span className="mt-0.5 font-inter text-xs text-mineshaft-200">{friendlyName}</span>
        <span className=" text-xs text-mineshaft-400">2034-08-24</span>
        <Badge variant="danger" className="mt-1 w-min whitespace-nowrap capitalize">
          Expires in 6d
        </Badge>
      </div>
      <Handle
        type="source"
        className="pointer-events-none !cursor-pointer opacity-0"
        position={Position.Bottom}
      />
    </>
  );
};
