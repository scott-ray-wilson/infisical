import { CopyButton } from "@app/components/v2/CopyButton";
import { formatProjectRoleName } from "@app/helpers/roles";
import { TGroupMembership } from "@app/hooks/api/groups/types";

type Props = {
  groupMembership: TGroupMembership;
};

export const GroupDetailsSection = ({ groupMembership }: Props) => {
  return (
    <div className="rounded-lg border border-mineshaft-600 bg-mineshaft-900 p-4">
      <div className="flex items-center justify-between border-b border-mineshaft-400 pb-4">
        <h3 className="text-lg font-semibold text-mineshaft-100">Group Details</h3>
      </div>
      <div className="pt-4">
        <div className="mb-4">
          <p className="text-sm font-semibold text-mineshaft-300">Group ID</p>
          <div className="group flex items-center gap-2">
            <p className="text-sm text-mineshaft-300">{groupMembership.group.id}</p>
            <CopyButton
              value={groupMembership.group.id}
              name="Group ID"
              size="xs"
              variant="plain"
            />
          </div>
        </div>
        <div className="mb-4">
          <p className="text-sm font-semibold text-mineshaft-300">Name</p>
          <p className="text-sm text-mineshaft-300">{groupMembership.group.name}</p>
        </div>
        <div className="mb-4">
          <p className="text-sm font-semibold text-mineshaft-300">Slug</p>
          <div className="group flex items-center gap-2">
            <p className="text-sm text-mineshaft-300">{groupMembership.group.slug}</p>
            <CopyButton value={groupMembership.group.slug} name="Slug" size="xs" variant="plain" />
          </div>
        </div>
        <div className="mb-4">
          <p className="text-sm font-semibold text-mineshaft-300">Project Roles</p>
          <p className="text-sm text-mineshaft-300">
            {groupMembership.roles
              .map((role) => formatProjectRoleName(role.role, role.customRoleName))
              .join(", ")}
          </p>
        </div>
        <div className="mb-4">
          <p className="text-sm font-semibold text-mineshaft-300">Joined Project</p>
          <p className="text-sm text-mineshaft-300">
            {new Date(groupMembership.createdAt).toLocaleString()}
          </p>
        </div>
      </div>
    </div>
  );
};
