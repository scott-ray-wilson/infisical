import { MongoAbility, MongoQuery, subject as abilitySubject } from "@casl/ability";
import Dagre from "@dagrejs/dagre";
import { Edge, MarkerType, Node } from "@xyflow/react";

import { PermissionAccess } from "@app/components/permissions/AccessTree/types";
import {
  ProjectPermissionActions,
  ProjectPermissionSet,
  ProjectPermissionSub
} from "@app/context/ProjectPermissionContext";
import { TSecretFolderWithPath } from "@app/hooks/api/secretFolders/types";

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

const multiplier = 8;

const props = {
  height: 4 * multiplier,
  width: 33 * multiplier
};

export const createFolderNode = ({
  folder,
  permissions,
  environment,
  subject
}: {
  folder: TSecretFolderWithPath;
  permissions: MongoAbility<ProjectPermissionSet, MongoQuery>;
  environment: string;
  subject: ProjectPermissionSub;
}) => {
  const rules = permissions.rules.filter((rule) => {
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
          permissions.can(action, abilitySubject(subject, { secretPath: folder.path, environment }))
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

const ColorMap: Record<PermissionAccess, string> = {
  [PermissionAccess.Full]: "#2ecc71",
  [PermissionAccess.Partial]: "#f1c40f",
  [PermissionAccess.None]: "#e74c3c"
};

export const createEdge = ({
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
