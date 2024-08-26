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
import { CertificateNode } from "./CertificateNode";
import { HierarchyEdge } from "./HierarchyEdge";
import { IssueCertNode } from "./IssueCertNode";

import "@xyflow/react/dist/style.css";

const multiplier = 14;

const markerStart = {
  type: MarkerType.ArrowClosed,
  color: "#707174"
};

const props = {
  height: 7.2 * multiplier,
  width: 13 * multiplier
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
    data: { type: "intermediate", friendlyName: "LDN-01 (EU)", status: "active" }
  },
  {
    id: "5",
    type: "certificateNode",
    ...props,
    position: { x: 0, y: 0 },
    data: { friendlyName: "ENG-01" }
  },
  {
    id: "6",
    type: "certificateNode",
    ...props,
    position: { x: 0, y: 0 },
    data: { friendlyName: "LAB-04" }
  },
  {
    id: "7",
    type: "certificateNode",
    ...props,
    position: { x: 0, y: 0 },
    data: { friendlyName: "ENG-03" }
  },
  {
    id: "8",
    type: "certificateNode",
    ...props,
    position: { x: 0, y: 0 },
    data: { friendlyName: "LAB-01" }
  },
  {
    id: "9",
    type: "issueCertNode",
    height: 40,
    width: 40,
    position: { x: 0, y: 0 },
    data: {}
  }
  // {
  //   id: "10",
  //   type: "issueCertNode",
  //   height: 40,
  //   width: 40,
  //   position: { x: 0, y: 0 },
  //   data: {}
  // },
  // {
  //   id: "11",
  //   type: "issueCertNode",
  //   height: 40,
  //   width: 40,
  //   position: { x: 0, y: 0 },
  //   data: {}
  // }
];
const initialEdges = [
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
  },
  {
    type: "hierarchyEdge",
    id: "e2-5",
    source: "2",
    target: "5",
    animated: true,
    markerStart
  },
  {
    type: "hierarchyEdge",
    id: "e2-6",
    source: "2",
    target: "6",
    animated: true,
    markerStart
  },
  {
    type: "hierarchyEdge",
    id: "e3-7",
    source: "3",
    target: "7",
    animated: true,
    markerStart
  },
  {
    type: "hierarchyEdge",
    id: "e3-8",
    source: "3",
    target: "8",
    animated: true,
    markerStart
  },
  {
    type: "hierarchyEdge",
    id: "e4-9",
    source: "4",
    target: "9",
    animated: true,
    markerStart
  }
  // {
  //   type: "hierarchyEdge",
  //   id: "e2-10",
  //   source: "2",
  //   target: "10",
  //   animated: true,
  //   markerStart
  // },
  // {
  //   type: "hierarchyEdge",
  //   id: "e3-11",
  //   source: "3",
  //   target: "11",
  //   animated: true,
  //   markerStart
  // }
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
  const nodeTypes = useMemo(
    () => ({ caNode: CaNode, certificateNode: CertificateNode, issueCertNode: IssueCertNode }),
    []
  );
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
      className="rounded-md border  border-mineshaft"
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
      fitViewOptions={{ padding: 0.1 }}
      nodesDraggable={false}
      edgesReconnectable={false}
      nodesConnectable={false}
      connectionLineType={ConnectionLineType.SmoothStep}
      // panOnDrag={false}
      // zoomOnPinch={false}
      // zoomOnScroll={false}
      // zoomOnDoubleClick={false}
      // preventScrolling={false}
      // draggable={false}
      proOptions={{
        hideAttribution: true // TODO: add back if not using Pro
      }}
    >
      <Background color="#5d5f64" bgColor="#111419" variant={BackgroundVariant.Dots} />
      <Controls position="bottom-left" />
    </ReactFlow>
  );
};
