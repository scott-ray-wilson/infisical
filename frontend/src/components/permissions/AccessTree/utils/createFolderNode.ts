import { MongoAbility, MongoQuery, subject as abilitySubject } from "@casl/ability";

import {
  ProjectPermissionActions,
  ProjectPermissionSet,
  ProjectPermissionSub
} from "@app/context/ProjectPermissionContext";
import { TSecretFolderWithPath } from "@app/hooks/api/secretFolders/types";

import { PermissionAccess, PermissionNode } from "../types";

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
          permissions.can(
            // @ts-expect-error we are not specifying which so can't resolve if valid
            action,
            abilitySubject(subject, {
              secretPath: folder.path,
              environment,
              secretName: "*",
              secretTags: ["*"]
            })
          )
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
      actionRuleMap,
      subject
    },
    position: { x: 0, y: 0 },
    width: 264,
    height: 64
  };
};
