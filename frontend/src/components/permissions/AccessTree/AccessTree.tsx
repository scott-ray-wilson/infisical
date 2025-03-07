import { useCallback, useEffect, useMemo, useState } from "react";
import { MongoAbility, MongoQuery } from "@casl/ability";
import {
  Background,
  BackgroundVariant,
  ConnectionLineType,
  Controls,
  Edge,
  Node,
  Panel,
  ReactFlow,
  ReactFlowProvider,
  useEdgesState,
  useNodesState,
  useReactFlow
} from "@xyflow/react";

import { AccessTreeErrorBoundary } from "@app/components/permissions/AccessTree/boundary/AccessTreeErrorBoundary";
import { EnvironmentNode } from "@app/components/permissions/AccessTree/nodes/EnvironmentNode";
import { PermissionAccess } from "@app/components/permissions/AccessTree/types";
import {
  createEdge,
  createFolderNode,
  createRoleNode,
  positionElements
} from "@app/components/permissions/AccessTree/utils";
import { FormLabel, Select, SelectItem, Spinner } from "@app/components/v2";
import { ProjectPermissionSub, useWorkspace } from "@app/context";
import { ProjectPermissionSet } from "@app/context/ProjectPermissionContext";
import { useListProjectEnvironmentsFolders } from "@app/hooks/api/secretFolders/queries";

import { BasePermissionEdge } from "./edges";
import { FolderNode, RoleNode } from "./nodes";

import "@xyflow/react/dist/style.css";

export enum PermissionNode {
  Role = "role",
  Folder = "folder",
  Environment = "environment"
}

export enum PermissionEdge {
  Base = "base"
}

type TProps = {
  permissions: MongoAbility<ProjectPermissionSet, MongoQuery>;
};

const AccessTreeContent = ({ permissions }: TProps) => {
  const { currentWorkspace } = useWorkspace();

  const { data: environmentsFolders, isPending } = useListProjectEnvironmentsFolders(
    currentWorkspace.id
  );

  const [nodes, setNodes] = useNodesState<Node>([]);
  const [edges, setEdges] = useEdgesState<Edge>([]);
  const [subject, setSubject] = useState(ProjectPermissionSub.Secrets);
  const [environment, setEnvironment] = useState(currentWorkspace.environments[0].slug);

  useEffect(() => {
    if (!environmentsFolders || !permissions) return;

    const roleNode = createRoleNode(subject);

    const { folders } = environmentsFolders[environment];

    const folderNodes = folders.map((folder) =>
      createFolderNode({ folder, permissions, environment, subject })
    );

    const folderEdges = folderNodes.map(({ data: folder }) => {
      const actions = Object.values(folder.actions);

      let access: PermissionAccess;
      if (Object.values(actions).some((action) => action === PermissionAccess.Full)) {
        access = PermissionAccess.Full;
      } else if (Object.values(actions).some((action) => action === PermissionAccess.Partial)) {
        access = PermissionAccess.Partial;
      } else {
        access = PermissionAccess.None;
      }

      return createEdge({
        source: folder.parentId ?? "role",
        target: folder.id,
        access
      });
    });

    const init = positionElements([roleNode, ...folderNodes], [...folderEdges]);
    setNodes(init.nodes);
    setEdges(init.edges);
  }, [permissions, environmentsFolders, environment, subject]);

  // const onConnect = useCallback((params) => setEdges((eds) => addEdge(params, eds)), [setEdges]);

  const edgeTypes = useMemo(() => ({ base: BasePermissionEdge }), []);
  const nodeTypes = useMemo(
    () => ({ role: RoleNode, folder: FolderNode, environment: EnvironmentNode }),
    []
  );

  const { fitView, getViewport, setCenter } = useReactFlow();

  const onNodeClick = useCallback(
    (event, node) => {
      // Center the view on the clicked node
      setCenter(
        node.position.x + node.width / 2,
        node.position.y + node.height / 2 + 50,
        { duration: 800, zoom: 1 } // Optional animation duration in ms
      );
    },
    [setCenter]
  );

  useEffect(() => {
    // Center the flow after the component mounts
    setTimeout(() => {
      fitView({
        padding: 0.2, // Adds 20% padding around the nodes
        duration: 1000, // Animation duration in milliseconds
        maxZoom: 1
      });
    }, 5);
  }, [fitView, nodes, edges, getViewport()]);

  return (
    <div className="h-full w-full">
      <ReactFlow
        className="rounded-md border border-mineshaft"
        nodes={nodes}
        edges={edges}
        edgeTypes={edgeTypes}
        nodeTypes={nodeTypes}
        fitView
        onNodeClick={onNodeClick}
        colorMode="dark"
        nodesDraggable={false}
        edgesReconnectable={false}
        nodesConnectable={false}
        connectionLineType={ConnectionLineType.SmoothStep}
        proOptions={{
          hideAttribution: false // we need pro license if we want to hide
        }}
      >
        {isPending && (
          <Panel className="flex h-full w-full items-center justify-center">
            <Spinner />
          </Panel>
        )}
        <Panel
          position="top-left"
          className="opacity-40 transition-opacity duration-200 hover:opacity-100"
        >
          <FormLabel label="Policy" />
          <Select
            value={subject}
            onValueChange={(value) => setSubject(value as ProjectPermissionSub)}
            className="w-[11.5rem] border border-mineshaft-500 capitalize"
            position="popper"
            dropdownContainerClassName="max-w-none"
          >
            {[
              ProjectPermissionSub.Secrets,
              ProjectPermissionSub.SecretFolders,
              ProjectPermissionSub.DynamicSecrets,
              ProjectPermissionSub.SecretImports
            ].map((sub) => {
              return (
                <SelectItem className="capitalize" value={sub} key={sub}>
                  {sub.replace("-", " ")}
                </SelectItem>
              );
            })}
          </Select>
        </Panel>
        <Panel
          position="top-right"
          className="opacity-40 transition-opacity duration-200 hover:opacity-100"
        >
          <FormLabel label="Environment" />
          <Select
            value={environment}
            onValueChange={setEnvironment}
            className="w-44 border border-mineshaft-500 capitalize"
            position="popper"
            dropdownContainerClassName="max-w-[11rem]"
          >
            {currentWorkspace.environments.map(({ name, slug }) => {
              return (
                <SelectItem value={slug} key={slug}>
                  {name}
                </SelectItem>
              );
            })}
          </Select>
        </Panel>
        <Background color="#5d5f64" bgColor="#111419" variant={BackgroundVariant.Dots} />
        <Controls position="bottom-left" />
      </ReactFlow>
    </div>
  );
};

export const AccessTree = (props: TProps) => {
  return (
    <AccessTreeErrorBoundary {...props}>
      <ReactFlowProvider>
        <AccessTreeContent {...props} />
      </ReactFlowProvider>
    </AccessTreeErrorBoundary>
  );
};
