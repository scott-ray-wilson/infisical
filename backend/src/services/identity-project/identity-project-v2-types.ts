import { OrderByDirection, TProjectPermission } from "@app/lib/types";
import { TCreateIdentityDTO } from "@app/services/identity/identity-types";

import { ProjectUserMembershipTemporaryMode } from "../project-membership/project-membership-types";

export type TCreateProjectIdentityV2DTO = {
  projectId: string;
  roles: (
    | {
        role: string;
        isTemporary?: false;
      }
    | {
        role: string;
        isTemporary: true;
        temporaryMode: ProjectUserMembershipTemporaryMode.Relative;
        temporaryRange: string;
        temporaryAccessStartTime: string;
      }
  )[];
} & Omit<TCreateIdentityDTO, "role" | "orgId">;

export type TUpdateProjectIdentityDTO = {
  roles: (
    | {
        role: string;
        isTemporary?: false;
      }
    | {
        role: string;
        isTemporary: true;
        temporaryMode: ProjectUserMembershipTemporaryMode.Relative;
        temporaryRange: string;
        temporaryAccessStartTime: string;
      }
  )[];
  identityId: string;
} & TProjectPermission;

export type TDeleteProjectIdentityDTO = {
  identityId: string;
} & TProjectPermission;

export type TListProjectIdentityDTO = {
  limit?: number;
  offset?: number;
  orderBy?: ProjectIdentityOrderBy;
  orderDirection?: OrderByDirection;
  search?: string;
} & TProjectPermission;

export type TGetProjectIdentityByIdentityIdDTO = {
  identityId: string;
} & TProjectPermission;

export type TGetProjectIdentityByMembershipIdDTO = {
  identityMembershipId: string;
} & Omit<TProjectPermission, "projectId">;

export enum ProjectIdentityOrderBy {
  Name = "name"
}
