import slugify from "@sindresorhus/slugify";

import { alphaNumericNanoId } from "@app/lib/nanoid";
import { TUserOrgDeletionImpact } from "@app/services/org/org-dal";
import { TUserDALFactory } from "@app/services/user/user-dal";

import { AccountDeletionOrgImpactType } from "./user-types";

export const normalizeUsername = async (username: string, userDAL: Pick<TUserDALFactory, "findOne">) => {
  let attempt: string;
  let user;

  do {
    attempt = slugify(`${username}-${alphaNumericNanoId(4)}`);
    // eslint-disable-next-line no-await-in-loop
    user = await userDAL.findOne({ username: attempt });
  } while (user);

  return attempt;
};

/**
 * Classifies what deleting the user's account means for one of their org trees:
 * - nobody else attached: the org is unreachable afterwards, delete it with the account
 * - others attached but the user is the last active admin: block, deletion would strand them
 * - otherwise: only the user's own membership goes away
 */
export const classifyOrgDeletionImpact = (
  impact: Pick<TUserOrgDeletionImpact, "otherMemberCount" | "otherAdminCount" | "userIsActiveAdmin">
): AccountDeletionOrgImpactType => {
  if (impact.otherMemberCount === 0) return AccountDeletionOrgImpactType.OrgDeleted;
  if (impact.userIsActiveAdmin && impact.otherAdminCount === 0) return AccountDeletionOrgImpactType.BlockedLastAdmin;
  return AccountDeletionOrgImpactType.MembershipRemoved;
};

export const buildLastAdminBlockedMessage = (orgNames: string[]) => {
  const formatted = orgNames.map((name) => `"${name}"`).join(", ");
  return orgNames.length === 1
    ? `Deleting your account would leave the organization ${formatted} without an admin. Promote another admin, or delete the organization first.`
    : `Deleting your account would leave the organizations ${formatted} without an admin. Promote other admins, or delete these organizations first.`;
};
