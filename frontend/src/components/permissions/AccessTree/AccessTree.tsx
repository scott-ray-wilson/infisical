import { useCallback, useEffect } from "react";
import { MongoAbility, MongoQuery } from "@casl/ability";
import { faCircleQuestion } from "@fortawesome/free-regular-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  Background,
  BackgroundVariant,
  ConnectionLineType,
  Controls,
  Node,
  NodeMouseHandler,
  Panel,
  ReactFlow,
  ReactFlowProvider,
  useReactFlow
} from "@xyflow/react";

import { useAccessTree } from "@app/components/permissions/AccessTree/hooks";
import { FormLabel, Select, SelectItem, Spinner, Tooltip } from "@app/components/v2";
import { ProjectPermissionSub } from "@app/context";
import { ProjectPermissionSet } from "@app/context/ProjectPermissionContext";

import { AccessTreeErrorBoundary } from "./components";
import { BasePermissionEdge } from "./edges";
import { FolderNode, RoleNode } from "./nodes";

import "@xyflow/react/dist/style.css";

export type AccessTreeProps = {
  permissions: MongoAbility<ProjectPermissionSet, MongoQuery>;
};

const EdgeTypes = { base: BasePermissionEdge };

const NodeTypes = { role: RoleNode, folder: FolderNode };

const AccessTreeContent = ({ permissions }: AccessTreeProps) => {
  const {
    edges,
    nodes,
    isLoading,
    environment,
    subject,
    environments,
    setEnvironment,
    setSubject
  } = useAccessTree(permissions);

  const { fitView, getViewport, setCenter } = useReactFlow();

  const onNodeClick: NodeMouseHandler<Node> = useCallback(
    (_, node) => {
      setCenter(
        node.position.x + (node.width ? node.width / 2 : 0),
        node.position.y + (node.height ? node.height / 2 + 50 : 50),
        { duration: 1000, zoom: 1 }
      );
    },
    [setCenter]
  );

  useEffect(() => {
    setTimeout(() => {
      fitView({
        padding: 0.2,
        duration: 1000,
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
        edgeTypes={EdgeTypes}
        nodeTypes={NodeTypes}
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
        {isLoading && (
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
            {environments.map(({ name, slug }) => {
              return (
                <SelectItem value={slug} key={slug}>
                  {name}
                </SelectItem>
              );
            })}
          </Select>
        </Panel>
        <Panel position="bottom-right">
          <Tooltip
            className="max-w-2xl"
            position="top"
            content={
              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                  <div className="h-1 w-4 border-b-2 border-dashed border-green" />
                  <span>
                    Policy unconditionally allows permission for at least one action in this folder
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-1 w-4 border-b-2 border-dashed border-yellow" />
                  <span>
                    {" "}
                    Policy conditionally allows permission for at least one action in this folder
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-1 w-4 border-b-2 border-dashed border-red" />
                  <span>Policy always forbids permission for all actions in this folder</span>
                </div>
              </div>
            }
          >
            <FontAwesomeIcon className="mb-2 text-mineshaft-400" icon={faCircleQuestion} />
          </Tooltip>
        </Panel>
        <Background color="#5d5f64" bgColor="#111419" variant={BackgroundVariant.Dots} />
        <Controls position="bottom-left" />
      </ReactFlow>
    </div>
  );
};

export const AccessTree = (props: AccessTreeProps) => {
  return (
    <AccessTreeErrorBoundary {...props}>
      <ReactFlowProvider>
        <AccessTreeContent {...props} />
      </ReactFlowProvider>
    </AccessTreeErrorBoundary>
  );
};
