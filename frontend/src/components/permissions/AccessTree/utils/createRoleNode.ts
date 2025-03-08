import { PermissionNode } from "@app/components/permissions/AccessTree/types";

export const createRoleNode = (subject: string) => ({
  id: "role",
  position: { x: 0, y: 0 },
  data: {
    subject
  },
  type: PermissionNode.Role,
  height: 32,
  width: 264
});
