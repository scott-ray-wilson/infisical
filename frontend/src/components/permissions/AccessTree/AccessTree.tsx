import { useEffect, useMemo, useState } from "react";
import {
  Background,
  BackgroundVariant,
  ConnectionLineType,
  Controls,
  Panel,
  ReactFlow,
  ReactFlowProvider,
  useEdgesState,
  useNodesState,
  useReactFlow
} from "@xyflow/react";

import { EnvironmentNode } from "@app/components/permissions/AccessTree/nodes/EnvironmentNode";
import { PermissionAccess } from "@app/components/permissions/AccessTree/types";
import {
  createEdge,
  createFolderNode,
  createRoleNode,
  evaluatePermissions,
  positionElements
} from "@app/components/permissions/AccessTree/utils";
import { Spinner } from "@app/components/v2";
import { ProjectPermissionSub, useProjectPermission, useWorkspace } from "@app/context";
import { useListProjectEnvironmentsFolders } from "@app/hooks/api/secretFolders/queries";
import { formRolePermission2API } from "@app/pages/project/RoleDetailsBySlugPage/components/ProjectRoleModifySection.utils";

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
  permissions: any;
};

const AccessTreeContent = ({ permissions }: TProps) => {
  const [subject, setSubject] = useState(ProjectPermissionSub.Secrets);

  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const { currentWorkspace } = useWorkspace();
  const [isLoading, setIsLoading] = useState(false);

  const test = useProjectPermission();
  const [environment, setEnvironment] = useState(currentWorkspace.environments[0].slug);

  const { data: environmentsFolders, isPending } = useListProjectEnvironmentsFolders(
    currentWorkspace.id
  );
  console.log("folders", environmentsFolders);

  useEffect(() => {
    if (!environmentsFolders) return;

    const permission = evaluatePermissions(formRolePermission2API(permissions));

    const roleNode = createRoleNode(subject);

    const { folders } = environmentsFolders[environment];

    const folderNodes = folders.map((folder) =>
      createFolderNode({ folder, permission, environment })
    );

    const folderEdges = folderNodes.map(({ data: folder }) => {
      const actions = Object.values(folder.actions);

      let access: PermissionAccess;
      if (actions.every((action) => action)) {
        access = PermissionAccess.Full;
      } else if (actions.some((action) => action)) {
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

    console.log("edges", folderEdges);

    // (async () => {
    //   setIsLoading(true);
    //
    //
    //   const { parent, descendants } = await fetchAllProjectFolders(
    //     currentWorkspace.id,
    //     environments[0],
    //     "/"
    //   );
    //
    //   const nodes = [];
    //   const edges = [];
    //
    //   environments.forEach((environment) => {

    //
    //
    //

    //
    //     nodes.push(...folderNodes);
    //
    //
    //     edges.push(...folderEdges);
    //   });
    //
    const init = positionElements([roleNode, ...folderNodes], [...folderEdges]);
    console.log("init", init);
    setNodes(init.nodes);
    setEdges(init.edges);
    //   setIsLoading(false);
    // })();
  }, [JSON.stringify(permissions), environmentsFolders]);

  // const onConnect = useCallback((params) => setEdges((eds) => addEdge(params, eds)), [setEdges]);

  const edgeTypes = useMemo(() => ({ base: BasePermissionEdge }), []);
  const nodeTypes = useMemo(
    () => ({ role: RoleNode, folder: FolderNode, environment: EnvironmentNode }),
    []
  );

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

  if (isLoading || !edges.length) return null;

  console.log("zedges", edges, nodes);

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
          hideAttribution: false // we need pro license if we want to hide
        }}
      >
        {isPending && (
          <Panel className="flex h-full w-full items-center justify-center">
            <Spinner />
          </Panel>
        )}
        <Background color="#5d5f64" bgColor="#111419" variant={BackgroundVariant.Dots} />
        <Controls position="bottom-left" />
      </ReactFlow>
    </div>
  );
};

export const AccessTree = (props: TProps) => {
  return (
    <ReactFlowProvider>
      <AccessTreeContent {...props} />
    </ReactFlowProvider>
  );
};
