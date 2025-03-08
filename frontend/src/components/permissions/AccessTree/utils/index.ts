import { PROJECT_PERMISSION_OBJECT } from "@app/pages/project/RoleDetailsBySlugPage/components/ProjectRoleModifySection.utils";

export * from "./createBaseEdge";
export * from "./createFolderNode";
export * from "./createRoleNode";
export * from "./positionElements";

export const ACTION_NAME_MAP = Object.fromEntries(
  Object.entries(PROJECT_PERMISSION_OBJECT).map(([subject, { actions }]) => [
    subject,
    Object.fromEntries(actions.map(({ label, value }) => [value, label]))
  ])
);
