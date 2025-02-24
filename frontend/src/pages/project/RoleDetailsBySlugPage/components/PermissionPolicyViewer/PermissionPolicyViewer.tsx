import React, { useEffect, useMemo, useState } from "react";
import {
  Background,
  BackgroundVariant,
  ConnectionLineType,
  Controls,
  ReactFlow,
  useEdgesState,
  useNodesState,
  useReactFlow
} from "@xyflow/react";

import { useWorkspace } from "@app/context";

import { BasePermissionEdge } from "./edges";
import { FolderNode, RoleNode } from "./nodes";
import {
  createEdge,
  createFolderNode,
  createRoleNode,
  fetchAllProjectFolders,
  positionElements
} from "./utils";

import "@xyflow/react/dist/style.css";

export enum PermissionNode {
  Role = "role",
  Folder = "folder"
}

export enum PermissionEdge {
  Base = "base"
}

export const PermissionPolicyViewer = () => {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const { currentWorkspace } = useWorkspace();
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    (async () => {
      setIsLoading(true);
      const { parent, descendants } = await fetchAllProjectFolders(currentWorkspace.id, "dev");

      const folderNodes = [
        createFolderNode(parent),
        ...descendants.map((folder) => createFolderNode(folder))
      ];

      const folderEdges = descendants.map((folder) =>
        createEdge({ source: folder.parentId, target: folder.id })
      );
      console.log("parent", parent);

      const init = positionElements(
        [createRoleNode(), ...folderNodes],
        [createEdge({ source: "role", target: parent.id }), ...folderEdges]
      );
      setNodes(init.nodes);
      setEdges(init.edges);
      setIsLoading(false);
    })();
  }, []);

  // const onConnect = useCallback((params) => setEdges((eds) => addEdge(params, eds)), [setEdges]);

  const edgeTypes = useMemo(() => ({ base: BasePermissionEdge }), []);
  const nodeTypes = useMemo(() => ({ role: RoleNode, folder: FolderNode }), []);

  const { fitView } = useReactFlow();

  useEffect(() => {
    // Center the flow after the component mounts
    setTimeout(() => {
      fitView({
        padding: 0.2, // Adds 20% padding around the nodes
        duration: 800 // Animation duration in milliseconds
      });
    }, 5);
  }, [fitView, nodes, edges, isLoading]);

  if (isLoading) return null;

  return (
    <div className="h-96 w-full">
      <ReactFlow
        className="rounded-md border border-mineshaft"
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
        // fitViewOptions={{ padding: 0.2 }}
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
          hideAttribution: true
        }}
      >
        <Background color="#5d5f64" bgColor="#111419" variant={BackgroundVariant.Dots} />
        <Controls position="bottom-left" />
      </ReactFlow>
    </div>
  );
};
