import { TOrgPermission } from "@app/lib/types";

import { MfaMethod } from "../auth/auth-type";

export type TListUserGroupsDTO = {
  username: string;
} & Omit<TOrgPermission, "orgId">;

export enum UserEncryption {
  V1 = 1,
  V2 = 2
}

export type TUpdateUserMfaDTO = {
  userId: string;
  isMfaEnabled?: boolean;
  selectedMfaMethod?: MfaMethod;
};

export type TUpdateUserEmailDTO = {
  userId: string;
  newEmail: string;
};

export type TVerifyCurrentEmailOTPDTO = {
  userId: string;
  otpCode: string;
};

export enum AccountDeletionOrgImpactType {
  /** The user's membership goes away; the org keeps other members and at least one admin. */
  MembershipRemoved = "membership-removed",
  /** Nobody else is attached to the org tree; it is deleted together with the account. */
  OrgDeleted = "org-deleted",
  /** Other members remain but the user is the last active admin; deletion is blocked. */
  BlockedLastAdmin = "blocked-last-admin"
}

export type TAccountDeletionOrgImpact = {
  orgId: string;
  orgName: string;
  type: AccountDeletionOrgImpactType;
  otherMemberCount: number;
  identityCount: number;
  subOrgCount: number;
  /** Only ever true for org-deleted entries: a live paid subscription will be cancelled. */
  subscriptionToCancel: boolean;
};
