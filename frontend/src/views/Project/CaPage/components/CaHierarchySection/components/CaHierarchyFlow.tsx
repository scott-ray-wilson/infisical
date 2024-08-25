import { useEffect, useMemo, useState } from "react";
import Dagre from "@dagrejs/dagre";
import {
  Background,
  BackgroundVariant,
  ConnectionLineType,
  Controls,
  Edge,
  MarkerType,
  Node,
  ReactFlow
} from "@xyflow/react";

import { CaNode } from "./CaNode";
import { HierarchyEdge } from "./HierarchyEdge";

import "@xyflow/react/dist/style.css";

const multiplier = 14;

const markerStart = {
  type: MarkerType.ArrowClosed,
  color: "#707174"
};

const props = {
  height: 7.2 * multiplier,
  width: 11.5 * multiplier
};

const initialNodes: Node[] = [
  {
    id: "1",
    type: "caNode",
    ...props,
    position: { x: 0, y: 0 },
    data: { type: "root", friendlyName: "Infisical Root", status: "disabled" }
  },
  {
    id: "2",
    type: "caNode",
    ...props,
    position: { x: 0, y: 0 },
    data: { type: "intermediate", friendlyName: "CA-01 (West)", status: "active" }
  },
  {
    id: "3",
    type: "caNode",
    ...props,
    position: { x: 0, y: 0 },
    data: { type: "intermediate", friendlyName: "NY-01 (East)", status: "active" }
  },
  {
    id: "4",
    type: "caNode",
    ...props,
    position: { x: 0, y: 0 },
    data: { type: "intermediate", friendlyName: "FR-01 (EU)", status: "active" }
  }
];
const initialEdges = [
  {
    type: "hierarchyEdge",
    id: "e1-2",
    source: "1",
    target: "2",
    // animated: true,
    markerStart
  },
  {
    type: "hierarchyEdge",
    id: "e1-2",
    source: "1",
    target: "2",
    animated: true,
    markerStart
  },
  {
    type: "hierarchyEdge",
    id: "e1-3",
    source: "1",
    target: "3",
    animated: true,
    markerStart
  },
  {
    type: "hierarchyEdge",
    id: "e1-4",
    source: "1",
    target: "4",
    animated: true,
    markerStart
  }
];

type Props = {
  caId: string;
};

const positionElements = (nodes: Node[], edges: Edge[]) => {
  const dagre = new Dagre.graphlib.Graph({ directed: true })
    .setDefaultEdgeLabel(() => ({}))
    .setGraph({ rankdir: "TB" });

  edges.forEach((edge) => dagre.setEdge(edge.source, edge.target));
  nodes.forEach((node) => dagre.setNode(node.id, node));

  Dagre.layout(dagre, {});

  return {
    nodes: nodes.map((node) => {
      const { x, y } = dagre.node(node.id);

      return {
        ...node,
        position: {
          x: x - (node.width ? node.width / 2 : 0),
          y: y - (node.height ? node.height / 2 : 0)
        }
      };
    }),
    edges
  };
};

export const CaHierarchyFlow = ({ caId }: Props) => {
  const edgeTypes = useMemo(() => ({ hierarchyEdge: HierarchyEdge }), []);
  const nodeTypes = useMemo(() => ({ caNode: CaNode }), []);
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);

  useEffect(() => {
    const init = positionElements(initialNodes, initialEdges);
    setNodes(init.nodes);
    setEdges(init.edges);
  }, []);

  // const handleEdgesChange = useCallback<OnEdgesChange>(
  //   (changes) => {
  //     const updatedEdges = applyEdgeChanges(changes, edges);
  //
  //     const modified = positionElements(nodes, updatedEdges);
  //
  //     setEdges(modified.edges);
  //     setNodes(modified.nodes);
  //   },
  //   [edges, nodes]
  // );
  //
  // const handleNodesChange = useCallback<OnNodesChange>(
  //   (changes) => {
  //     const updatedNodes = applyNodeChanges(changes, nodes);
  //
  //     const modified = positionElements(updatedNodes, edges);
  //
  //     setEdges(modified.edges);
  //     setNodes(modified.nodes);
  //   },
  //   [edges, nodes]
  // );

  return (
    <ReactFlow
      key={caId}
      className="rounded-md border border-mineshaft text-gray-400"
      nodes={nodes}
      edges={edges}
      edgeTypes={edgeTypes}
      // connectionLineComponent={ConnectionLine}
      nodeTypes={nodeTypes}
      // onEdgesChange={handleEdgesChange}
      // onNodesChange={handleNodesChange}
      // onConnect={onConnect}
      fitView
      colorMode="dark"
      fitViewOptions={{ padding: 0.25 }}
      nodesDraggable={false}
      edgesReconnectable={false}
      nodesConnectable={false}
      connectionLineType={ConnectionLineType.SmoothStep}
      proOptions={{
        hideAttribution: true // TODO: add back if not using Pro
      }}
    >
      <Background color="#707174" bgColor="#1e1f22" variant={BackgroundVariant.Dots} />
      <Controls className="text-mineshaft-800" position="bottom-left" />
    </ReactFlow>
  );
};
