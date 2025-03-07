import {
  createMongoAbility,
  MongoAbility,
  MongoQuery,
  subject as abilitySubject
} from "@casl/ability";
import Dagre from "@dagrejs/dagre";
import { Edge, MarkerType, Node } from "@xyflow/react";

import { PermissionAccess } from "@app/components/permissions/AccessTree/types";
import {
  ProjectPermissionActions,
  ProjectPermissionSet,
  ProjectPermissionSub
} from "@app/context/ProjectPermissionContext";
import { conditionsMatcher } from "@app/hooks/api/roles/queries";
import { TSecretFolder, TSecretFolderWithPath } from "@app/hooks/api/secretFolders/types";
import { groupBy } from "@app/lib/fn/array";
import { omit } from "@app/lib/fn/object";

import { PermissionEdge, PermissionNode } from "../AccessTree";

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

type TFolderWithPath = TSecretFolder & { path: string };

// export const fetchAllProjectFolders = async (
//   workspaceId: string,
//   environment: string,
//   currentPath = "/"
// ): Promise<{ parent: TFolderWithPath; descendants: TFolderWithPath[] }> => {
//   // Get folders at current path
//   const folders = await fetchProjectFolders(workspaceId, environment, currentPath);
//   const parent = { name: currentPath, id: folders[0]?.parentId ?? "root", path: currentPath };
//
//   // Recursively fetch subfolders for each folder
//   const subfolderPromises = folders.map(async (folder) => {
//     const newPath = currentPath === "/" ? `/${folder.name}` : `${currentPath}/${folder.name}`;
//
//     const subfolders = await fetchAllProjectFolders(workspaceId, environment, newPath);
//
//     return [
//       { ...folder, path: newPath },
//       ...subfolders.descendants.map((nestedFolder) => ({ ...nestedFolder, path: newPath }))
//     ];
//   });
//
//   // Wait for all subfolder requests to complete and flatten results
//   const nestedResults = await Promise.all(subfolderPromises);
//   return { parent, descendants: nestedResults.flat() };
// };

const multiplier = 8;

const props = {
  height: 4 * multiplier,
  width: 33 * multiplier
};

export const createFolderNode = ({
  folder,
  permission,
  environment,
  subject
}: {
  folder: TSecretFolderWithPath;
  permission: MongoAbility<ProjectPermissionSet, MongoQuery>;
  environment: string;
  subject: ProjectPermissionSub;
}) => {
  const rules = permission.rules.filter((rule) => {
    const ruleSubject = typeof rule.subject === "string" ? rule.subject : rule.subject[0];
    return ruleSubject === subject;
  });

  const actionRuleMap: Record<string, (typeof rules)[number]>[] = [];
  rules.forEach((rule) => {
    if (typeof rule.action === "string") {
      actionRuleMap.push({ [rule.action]: rule });
    } else {
      actionRuleMap.push(Object.fromEntries(rule.action.map((action) => [action, rule])));
    }
  });

  const actions = Object.fromEntries(
    [
      ProjectPermissionActions.Create,
      ProjectPermissionActions.Read,
      ProjectPermissionActions.Edit,
      ProjectPermissionActions.Delete
    ].map((action) => {
      let access: PermissionAccess;
      try {
        if (
          permission.can(action, abilitySubject(subject, { secretPath: folder.path, environment }))
        ) {
          if (
            actionRuleMap.some(
              (el) => el[action]?.conditions?.secretName || el[action]?.conditions?.secretTags
            )
          ) {
            access = PermissionAccess.Partial;
          } else {
            access = PermissionAccess.Full;
          }
        } else {
          access = PermissionAccess.None;
        }
      } catch (e) {
        console.log("actions error");
        console.error(e);
        access = PermissionAccess.None;
      }

      return [action, access];
    })
  );

  return {
    type: PermissionNode.Folder,
    id: folder.id,
    data: {
      ...folder,
      actions,
      environment,
      actionRuleMap
    },
    position: { x: 0, y: 0 },
    ...props,
    height: 8 * multiplier
  };
};

export const createRoleNode = (subject: string) => ({
  id: "role",
  position: { x: 0, y: 0 },
  data: {
    subject
  },
  type: PermissionNode.Role,
  ...props
});

export const createEnvironmentNode = (name: string) => ({
  id: name,
  position: { x: 0, y: 0 },
  data: {
    name
  },
  type: PermissionNode.Environment,
  ...props
});

export const createEdge = ({
  source,
  target,
  access
}: {
  source: string;
  target: string;
  access: PermissionAccess;
}) => {
  let color: string;

  switch (access) {
    case PermissionAccess.Full:
      color = "#2ecc71";

      break;
    case PermissionAccess.Partial:
      color = "#f1c40f";

      break;
    case PermissionAccess.None:
    default:
      color = "#e74c3c";

      break;
  }

  return {
    id: `e${source}-${target}`,
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

export const evaluatePermissions = (rule: any[]) => {
  const negatedRules = groupBy(
    rule.filter((i) => i.inverted && i.conditions),
    (i) => `${i.subject}-${JSON.stringify(i.conditions)}`
  );
  const ability = createMongoAbility<ProjectPermissionSet>(rule, {
    // this allows in frontend to skip some rules using *
    conditionsMatcher: (rules) => {
      return (entity) => {
        // skip validation if its negated rules
        const isNegatedRule =
          // eslint-disable-next-line no-underscore-dangle
          negatedRules?.[`${entity.__caslSubjectType__}-${JSON.stringify(rules)}`];
        if (isNegatedRule) {
          const baseMatcher = conditionsMatcher(rules);
          return baseMatcher(entity);
        }

        const rulesStrippedOfWildcard = omit(
          rules,
          Object.keys(entity).filter((el) => entity[el]?.includes("*"))
        );
        const baseMatcher = conditionsMatcher(rulesStrippedOfWildcard);
        return baseMatcher(entity);
      };
    }
  });

  return ability;
};
