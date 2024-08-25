import { BaseEdge, BaseEdgeProps, EdgeProps, getSmoothStepPath } from "@xyflow/react";

export const HierarchyEdge = ({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  markerStart,
  markerEnd
}: Omit<BaseEdgeProps, "path"> & EdgeProps) => {
  const [edgePath] = getSmoothStepPath({
    sourceX,
    sourceY,
    targetX,
    targetY
  });

  return (
    <BaseEdge
      id={id}
      markerStart={markerStart}
      markerEnd={markerEnd}
      style={{
        strokeDasharray: "5",
        strokeWidth: 1,
        // stroke: "#707174"
        stroke: "#707174"
      }}
      path={edgePath}
    />
  );
};
