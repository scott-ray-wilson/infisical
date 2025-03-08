import { MarkerType } from "@xyflow/react";

import { PermissionAccess, PermissionEdge } from "../types";

const ColorMap: Record<PermissionAccess, string> = {
  [PermissionAccess.Full]: "#2ecc71",
  [PermissionAccess.Partial]: "#f1c40f",
  [PermissionAccess.None]: "#e74c3c"
};

export const createBaseEdge = ({
  source,
  target,
  access
}: {
  source: string;
  target: string;
  access: PermissionAccess;
}) => {
  const color = ColorMap[access];

  return {
    id: `e-${source}-${target}`,
    source,
    target,
    type: PermissionEdge.Base,
    markerEnd: {
      type: MarkerType.ArrowClosed,
      color
    },
    animated: true,
    style: { stroke: color }
  };
};
