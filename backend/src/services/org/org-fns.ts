import { Knex } from "knex";

import { AccessScope } from "@app/db/schemas";
import { TUserGroupMembershipDALFactory } from "@app/ee/services/group/user-group-membership-dal";
import { TLicenseServiceFactory } from "@app/ee/services/license/license-service";
import { BadRequestError } from "@app/lib/errors";
import { logger } from "@app/lib/logger";
import { TLicenseClientFactory } from "@app/services/license-client/license-client";
import { TOrgDALFactory } from "@app/services/org/org-dal";
import { TProjectKeyDALFactory } from "@app/services/project-key/project-key-dal";
import { TUserAliasDALFactory } from "@app/services/user-alias/user-alias-dal";

import { TAdditionalPrivilegeDALFactory } from "../additional-privilege/additional-privilege-dal";
import { TApprovalPolicyDALFactory } from "../approval-policy/approval-policy-dal";
import { APPLICATION_APPROVAL_SCOPES } from "../membership/application-membership-cleanup-service";
import { TMembershipRoleDALFactory } from "../membership/membership-role-dal";
import { TMembershipUserDALFactory } from "../membership-user/membership-user-dal";
import { assertWillRetainOrgAdmin } from "../membership-user/membership-user-fns";

type TDeleteOrgMemberships = {
  orgMembershipIds: string[];
  orgId: string;
  orgDAL: Pick<TOrgDALFactory, "transaction" | "find">;
  userGroupMembershipDAL: Pick<TUserGroupMembershipDALFactory, "delete">;
  membershipUserDAL: Pick<TMembershipUserDALFactory, "delete" | "find" | "countActiveAdmins">;
  membershipRoleDAL: Pick<TMembershipRoleDALFactory, "delete">;
  projectKeyDAL: Pick<TProjectKeyDALFactory, "find" | "delete">;
  userAliasDAL: Pick<TUserAliasDALFactory, "delete">;
  licenseService: Pick<TLicenseServiceFactory, "updateSubscriptionOrgMemberCount">;
  userId?: string;
  additionalPrivilegeDAL: Pick<TAdditionalPrivilegeDALFactory, "delete">;
  approvalPolicyDAL: Pick<TApprovalPolicyDALFactory, "deleteUserStepApproversInProjects">;
};

// Live means the subscription still bills or will bill again: Stripe active/trialing/past_due.
// Cancelled, unpaid, and incomplete subscriptions have nothing left to protect. Note a
// cancel-at-period-end subscription still reads "active" here (the license server does not expose
// the scheduled cancel), so callers must treat "live" as "needs cancelling", not "user forgot".
const LIVE_SUBSCRIPTION_STATUSES = ["active", "trialing", "past_due"];

export const hasLivePaidSubscription = async (
  orgId: string,
  licenseClient: Pick<TLicenseClientFactory, "getSubscription">
) => {
  const subscription = await licenseClient.getSubscription(orgId);
  if (!subscription) return false;
  if (!LIVE_SUBSCRIPTION_STATUSES.includes(subscription.status.toLowerCase())) return false;
  return subscription.items.some((item) => item.plan.toLowerCase() !== "free");
};

/**
 * Returns the subset of orgIds whose v2 subscription is live and paid. Fails open on lookup
 * errors: an org whose billing state cannot be verified is treated as paid, so sweep flows keep
 * it instead of deleting it.
 */
export const getOrgIdsWithLivePaidSubscription = async (
  orgIds: string[],
  licenseClient: Pick<TLicenseClientFactory, "getSubscription">
) => {
  const paidOrgIds = new Set<string>();
  for await (const orgId of orgIds) {
    try {
      if (await hasLivePaidSubscription(orgId, licenseClient)) paidOrgIds.add(orgId);
    } catch (error) {
      paidOrgIds.add(orgId);
      logger.error(error, `Could not verify subscription state, treating org as paid [orgId=${orgId}]`);
    }
  }
  return paidOrgIds;
};

type TFnHardDeleteOrganization = {
  orgDAL: Pick<TOrgDALFactory, "deleteById">;
  licenseService: Pick<TLicenseServiceFactory, "removeOrgCustomer">;
};

/**
 * Hard-deletes the org row (children, sub-orgs included, cascade via FKs) and tears down the
 * license-server v1 customer when one exists. V2 subscription cancellation is the caller's
 * concern: it needs user consent and per-flow failure handling.
 */
export const fnHardDeleteOrganization = async (
  orgId: string,
  { orgDAL, licenseService }: TFnHardDeleteOrganization,
  tx?: Knex
) => {
  const deletedOrg = await orgDAL.deleteById(orgId, tx);
  if (deletedOrg.customerId) {
    await licenseService.removeOrgCustomer(deletedOrg.customerId);
  }
  return deletedOrg;
};

type TFnDeleteOrphanedRootOrgs = {
  candidateRootOrgIds: string[];
  /**
   * Orgs to keep despite having no users left, e.g. a live paid subscription was detected (or
   * could not be verified) before the transaction opened.
   */
  protectedOrgIds: Set<string>;
  logContext: string;
  orgDAL: Pick<TOrgDALFactory, "deleteById" | "findRootOrgsWithNoAttachedUsers">;
  licenseService: Pick<TLicenseServiceFactory, "removeOrgCustomer">;
  tx: Knex;
};

/**
 * Deletes the candidate root orgs that no longer have any human attached (directly or via a
 * group, any membership status). Meant to run inside the same transaction that removed the user
 * rows, so the zero-users check and the delete are atomic.
 */
export const fnDeleteOrphanedRootOrgs = async ({
  candidateRootOrgIds,
  protectedOrgIds,
  logContext,
  orgDAL,
  licenseService,
  tx
}: TFnDeleteOrphanedRootOrgs) => {
  const orphanedOrgs = await orgDAL.findRootOrgsWithNoAttachedUsers(candidateRootOrgIds, tx);
  const deletedOrgs = [];
  for await (const org of orphanedOrgs) {
    if (protectedOrgIds.has(org.id)) {
      logger.warn(
        `${logContext}: org has no users left but carries a live subscription, keeping it for manual review [orgId=${org.id}]`
      );
    } else {
      deletedOrgs.push(await fnHardDeleteOrganization(org.id, { orgDAL, licenseService }, tx));
      logger.info(`${logContext}: deleted org left without any user [orgId=${org.id}] [orgName=${org.name}]`);
    }
  }
  return deletedOrgs;
};

export const deleteOrgMembershipsFn = async ({
  orgMembershipIds,
  orgId,
  orgDAL,
  projectKeyDAL,
  userAliasDAL,
  licenseService,
  userId,
  membershipUserDAL,
  userGroupMembershipDAL,
  additionalPrivilegeDAL,
  approvalPolicyDAL
}: TDeleteOrgMemberships) => {
  const deletedMemberships = await orgDAL.transaction(async (tx) => {
    await assertWillRetainOrgAdmin({
      scopeOrgId: orgId,
      excludeMembershipIds: orgMembershipIds,
      dal: membershipUserDAL,
      tx
    });

    const orgMemberships = await membershipUserDAL.delete(
      {
        scopeOrgId: orgId,
        scope: AccessScope.Organization,
        $in: {
          id: orgMembershipIds
        }
      },
      tx
    );

    const membershipUserIds = orgMemberships
      .filter((member) => Boolean(member.actorUserId))
      .map((member) => member.actorUserId) as string[];

    if (userId && membershipUserIds.includes(userId)) {
      throw new BadRequestError({ message: "You cannot remove yourself from an organization" });
    }

    if (!membershipUserIds.length) {
      await licenseService.updateSubscriptionOrgMemberCount(orgId);
      return orgMemberships;
    }

    await userAliasDAL.delete(
      {
        $in: {
          userId: membershipUserIds
        },
        orgId
      },
      tx
    );

    // Get all the project memberships of the users in the organization
    const childOrgs = await orgDAL.find({ rootOrgId: orgId }, { tx });

    // Delete all the project memberships of the users in the organization
    const otherMemberships = await membershipUserDAL.delete(
      {
        $in: {
          scopeOrgId: [orgId].concat(childOrgs.map((el) => el.id)),
          actorUserId: membershipUserIds
        }
      },
      tx
    );

    const orgGroups = await membershipUserDAL.find({
      $in: {
        scopeOrgId: [orgId].concat(childOrgs.map((el) => el.id))
      },
      $notNull: ["actorGroupId"]
    });

    const groupIds = orgGroups.filter((el) => el.actorGroupId).map((el) => el.actorGroupId as string);

    await userGroupMembershipDAL.delete(
      {
        $in: {
          userId: membershipUserIds,
          groupId: groupIds
        }
      },
      tx
    );
    const projectIds = otherMemberships
      .filter((el) => el.scope === AccessScope.Project && el.scopeProjectId)
      .map((el) => el.scopeProjectId as string);

    await additionalPrivilegeDAL.delete(
      {
        $in: {
          projectId: projectIds,
          actorUserId: membershipUserIds
        }
      },
      tx
    );

    await approvalPolicyDAL.deleteUserStepApproversInProjects(
      {
        projectIds,
        userIds: membershipUserIds,
        scopeTypes: APPLICATION_APPROVAL_SCOPES
      },
      tx
    );

    // Delete all the project keys of the user in the organization
    await projectKeyDAL.delete(
      {
        $in: {
          projectId: projectIds,
          receiverId: membershipUserIds
        }
      },
      tx
    );

    await licenseService.updateSubscriptionOrgMemberCount(orgId);
    return orgMemberships;
  });

  return deletedMemberships;
};
