import Dagre from "@dagrejs/dagre";
import { Edge, MarkerType, Node } from "@xyflow/react";

import { fetchProjectFolders } from "@app/hooks/api/secretFolders/queries";
import { TSecretFolder } from "@app/hooks/api/secretFolders/types";

import { PermissionEdge, PermissionNode } from "../PermissionPolicyViewer";

export const positionElements = (nodes: Node[], edges: Edge[]) => {
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

export const fetchAllProjectFolders = async (
  workspaceId: string,
  environment: string,
  currentPath = "/"
): Promise<{ parent: TSecretFolder; descendants: TSecretFolder[] }> => {
  // Get folders at current path
  const folders = await fetchProjectFolders(workspaceId, environment, currentPath);
  const parent = { name: currentPath, id: folders[0]?.parentId ?? "root" };

  // Recursively fetch subfolders for each folder
  const subfolderPromises = folders.map(async (folder) => {
    const newPath = currentPath === "/" ? `/${folder.name}` : `${currentPath}/${folder.name}`;

    const subfolders = await fetchAllProjectFolders(workspaceId, environment, newPath);

    return [folder, ...subfolders.descendants];
  });

  // Wait for all subfolder requests to complete and flatten results
  const nestedResults = await Promise.all(subfolderPromises);
  return { parent, descendants: nestedResults.flat() };
};

const multiplier = 8;

const props = {
  height: 7.2 * multiplier,
  width: 18 * multiplier
};

export const createFolderNode = (folder: TSecretFolder) => ({
  type: PermissionNode.Folder,
  id: folder.id,
  data: folder,
  position: { x: 0, y: 0 },
  ...props
});

export const createRoleNode = () => ({
  id: "role",
  position: { x: 0, y: 0 },
  data: {},
  type: PermissionNode.Role,
  ...props
});

export const createEdge = ({ source, target }: { source: string; target: string }) => ({
  id: `e${source}-${target}`,
  source,
  target,
  type: PermissionEdge.Base,
  markerEnd: {
    type: MarkerType.ArrowClosed,
    color: "green"
  },
  animated: true,
  style: { stroke: "green" }
});
