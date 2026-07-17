import { ForbiddenError } from "@casl/ability";
import { Knex } from "knex";

import { AccessScope, OrganizationActionScope } from "@app/db/schemas";
import { TLicenseServiceFactory } from "@app/ee/services/license/license-service";
import { OrgPermissionActions, OrgPermissionSubjects } from "@app/ee/services/permission/org-permission";
import { TPermissionServiceFactory } from "@app/ee/services/permission/permission-service-types";
import { PgSqlLock } from "@app/keystore/keystore";
import { getConfig } from "@app/lib/config/env";
import { crypto } from "@app/lib/crypto";
import { BadRequestError, ForbiddenRequestError, InternalServerError, NotFoundError } from "@app/lib/errors";
import { logger } from "@app/lib/logger";
import { sanitizeEmail, validateEmail } from "@app/lib/validator";
import { TAuthTokenServiceFactory } from "@app/services/auth-token/auth-token-service";
import { TokenType } from "@app/services/auth-token/auth-token-types";
import { TLicenseClientFactory } from "@app/services/license-client/license-client";
import { TOrgDALFactory } from "@app/services/org/org-dal";
import {
  fnDeleteOrphanedRootOrgs,
  fnHardDeleteOrganization,
  getOrgIdsWithLivePaidSubscription,
  hasLivePaidSubscription
} from "@app/services/org/org-fns";
import { SmtpTemplates, TSmtpService } from "@app/services/smtp/smtp-service";

import { ActorType, AuthMethod, AuthModeSignUpTokenPayload, AuthTokenType } from "../auth/auth-type";
import { TGroupProjectDALFactory } from "../group-project/group-project-dal";
import { TMembershipUserDALFactory } from "../membership-user/membership-user-dal";
import { TUserAliasDALFactory } from "../user-alias/user-alias-dal";
import { TUserDALFactory } from "./user-dal";
import { buildLastAdminBlockedMessage, classifyOrgDeletionImpact } from "./user-fns";
import {
  AccountDeletionOrgImpactType,
  TAccountDeletionOrgImpact,
  TListUserGroupsDTO,
  TUpdateUserEmailDTO,
  TUpdateUserMfaDTO,
  TVerifyCurrentEmailOTPDTO
} from "./user-types";

type TUserServiceFactoryDep = {
  userDAL: Pick<
    TUserDALFactory,
    | "find"
    | "findOne"
    | "findById"
    | "transaction"
    | "updateById"
    | "update"
    | "deleteById"
    | "findOneUserAction"
    | "createUserAction"
    | "findUserEncKeyByUserId"
    | "delete"
    | "findAllMyAccounts"
  >;
  groupProjectDAL: Pick<TGroupProjectDALFactory, "findByUserId">;
  orgDAL: Pick<
    TOrgDALFactory,
    | "findById"
    | "find"
    | "findEffectiveOrgMembership"
    | "findEffectiveOrgMemberships"
    | "getUserOrgDeletionImpact"
    | "findRootOrgIdsForUsers"
    | "findRootOrgsWithNoAttachedUsers"
    | "deleteById"
  >;
  membershipUserDAL: Pick<TMembershipUserDALFactory, "find" | "insertMany" | "findOne" | "updateById">;
  tokenService: Pick<TAuthTokenServiceFactory, "createTokenForUser" | "validateTokenForUser" | "revokeAllMySessions">;
  smtpService: Pick<TSmtpService, "sendMail">;
  permissionService: TPermissionServiceFactory;
  userAliasDAL: Pick<TUserAliasDALFactory, "findOne" | "find" | "updateById" | "delete">;
  licenseService: Pick<TLicenseServiceFactory, "removeOrgCustomer" | "updateSubscriptionOrgMemberCount">;
  licenseClient: Pick<TLicenseClientFactory, "getSubscription" | "cancelSubscription">;
};

export type TUserServiceFactory = ReturnType<typeof userServiceFactory>;

export const userServiceFactory = ({
  userDAL,
  orgDAL,
  membershipUserDAL,
  groupProjectDAL,
  tokenService,
  smtpService,
  permissionService,
  userAliasDAL,
  licenseService,
  licenseClient
}: TUserServiceFactoryDep) => {
  const sendEmailVerificationCode = async (token: string) => {
    const config = getConfig();

    const { aliasId, userId, authTokenType } = crypto
      .jwt()
      .verify(token, config.AUTH_SECRET) as AuthModeSignUpTokenPayload;
    if (authTokenType !== AuthTokenType.SIGNUP_TOKEN) throw new BadRequestError({ name: "Invalid auth token type" });

    const user = await userDAL.findById(userId);
    if (!user) throw new BadRequestError({ message: "Invalid token" });

    let { isEmailVerified } = user;
    if (aliasId) {
      const userAlias = await userAliasDAL.findOne({ userId: user.id, id: aliasId });
      if (!userAlias) throw new NotFoundError({ name: `User alias with ID '${aliasId}' not found` });
      isEmailVerified = userAlias.isEmailVerified;
    }

    if (!user.email) throw new BadRequestError({ message: "Invalid token" });
    if (isEmailVerified) throw new BadRequestError({ name: "Invalid token" });

    const userToken = await tokenService.createTokenForUser({
      type: TokenType.TOKEN_EMAIL_VERIFICATION,
      userId: user.id,
      aliasId
    });

    await smtpService.sendMail({
      template: SmtpTemplates.EmailVerification,
      subjectLine: `Infisical confirmation code: ${userToken}`,
      recipients: [user.email],
      substitutions: {
        code: userToken
      }
    });
  };

  const updateUserMfa = async ({ userId, isMfaEnabled, selectedMfaMethod }: TUpdateUserMfaDTO) => {
    const user = await userDAL.findById(userId);

    if (!user || !user.email) throw new BadRequestError({ name: "Failed to toggle MFA" });

    let mfaMethods;
    if (isMfaEnabled === undefined) {
      mfaMethods = undefined;
    } else {
      mfaMethods = isMfaEnabled ? ["email"] : [];
    }

    const updatedUser = await userDAL.updateById(userId, {
      isMfaEnabled,
      mfaMethods,
      selectedMfaMethod
    });

    return updatedUser;
  };

  const updateUserName = async (userId: string, firstName: string, lastName: string) => {
    const updatedUser = await userDAL.updateById(userId, {
      firstName,
      lastName
    });
    return updatedUser;
  };

  const updateAuthMethods = async (userId: string, authMethods: AuthMethod[]) => {
    const user = await userDAL.findById(userId);
    if (!user) throw new NotFoundError({ message: `User with ID '${userId}' not found`, name: "UpdateAuthMethods" });

    if (user.authMethods?.includes(AuthMethod.LDAP) || authMethods.includes(AuthMethod.LDAP)) {
      throw new BadRequestError({ message: "LDAP auth method cannot be updated", name: "UpdateAuthMethods" });
    }

    // When email auth is removed, clear the stored password so no stale credential lingers.
    // Re-enabling email auth later requires a fresh password via the setup flow.
    const isRemovingEmailAuth = user.authMethods?.includes(AuthMethod.EMAIL) && !authMethods.includes(AuthMethod.EMAIL);

    const updatedUser = await userDAL.updateById(userId, {
      authMethods,
      ...(isRemovingEmailAuth ? { hashedPassword: null } : {})
    });
    return updatedUser;
  };

  const checkUserScimRestriction = async (userId: string, tx?: Knex) => {
    const userOrgs = await membershipUserDAL.find(
      {
        actorUserId: userId,
        scope: AccessScope.Organization
      },
      { tx }
    );

    if (userOrgs.length === 0) {
      return false;
    }

    const orgIds = userOrgs.map((membership) => membership.scopeOrgId);
    const organizations = await orgDAL.find({ $in: { id: orgIds } }, { tx });

    return organizations.some((org) => org.scimEnabled);
  };

  const requestEmailChangeOTP = async ({ userId, newEmail }: TUpdateUserEmailDTO) => {
    const startTime = new Date();
    const normalizedNewEmail = sanitizeEmail(newEmail);
    validateEmail(normalizedNewEmail);
    const changeEmailOTP = await userDAL.transaction(async (tx) => {
      const user = await userDAL.findById(userId, tx);
      if (!user)
        throw new NotFoundError({ message: `User with ID '${userId}' not found`, name: "RequestEmailChangeOTP" });

      if (user.authMethods?.includes(AuthMethod.LDAP)) {
        throw new BadRequestError({ message: "Cannot update email for LDAP users", name: "RequestEmailChangeOTP" });
      }

      if (!user.email) {
        throw new BadRequestError({
          message: "Cannot change email: no current email address is set on this account.",
          name: "RequestEmailChangeOTP"
        });
      }

      const hasScimRestriction = await checkUserScimRestriction(userId, tx);
      if (hasScimRestriction) {
        throw new BadRequestError({
          message: "Email changes are disabled because SCIM is enabled for one or more of your organizations",
          name: "RequestEmailChangeOTP"
        });
      }

      // Silently check if another user already has this email - don't send OTP if email is taken
      const existingUser = await userDAL.findOne({ username: normalizedNewEmail }, tx);
      if (!existingUser) {
        // Step 1 of 2: send OTP to the CURRENT email so the legitimate owner must approve
        // the change before any code is sent to the new address.
        const otpCode = await tokenService.createTokenForUser({
          type: TokenType.TOKEN_EMAIL_CHANGE_CURRENT_OTP,
          userId,
          payload: newEmail.toLowerCase()
        });

        await smtpService.sendMail({
          template: SmtpTemplates.EmailChangeRequestNotification,
          subjectLine: "Confirm your Infisical email change",
          recipients: [user.email],
          substitutions: {
            currentEmail: user.email,
            requestedEmail: newEmail.toLowerCase(),
            code: otpCode
          }
        });
      }

      return { success: true, message: "Verification code sent to current email address" };
    });
    // Force this function to have a minimum execution time of 2 seconds to avoid possible information disclosure about existing users
    const endTime = new Date();
    const timeDiff = endTime.getTime() - startTime.getTime();
    if (timeDiff < 2000) {
      await new Promise((resolve) => {
        setTimeout(resolve, 2000 - timeDiff);
      });
    }
    return changeEmailOTP;
  };

  const verifyCurrentEmailOTP = async ({ userId, otpCode }: TVerifyCurrentEmailOTPDTO) => {
    return userDAL.transaction(async (tx) => {
      const user = await userDAL.findById(userId, tx);
      if (!user)
        throw new NotFoundError({ message: `User with ID '${userId}' not found`, name: "VerifyCurrentEmailOTP" });

      if (user.authMethods?.includes(AuthMethod.LDAP)) {
        throw new BadRequestError({ message: "Cannot update email for LDAP users", name: "VerifyCurrentEmailOTP" });
      }

      const hasScimRestriction = await checkUserScimRestriction(userId, tx);
      if (hasScimRestriction) {
        throw new BadRequestError({
          message: "Email changes are disabled because SCIM is enabled for one or more of your organizations",
          name: "VerifyCurrentEmailOTP"
        });
      }

      let tokenData;
      try {
        tokenData = await tokenService.validateTokenForUser({
          type: TokenType.TOKEN_EMAIL_CHANGE_CURRENT_OTP,
          userId,
          code: otpCode
        });
      } catch (error) {
        throw new BadRequestError({ message: "Invalid verification code", name: "VerifyCurrentEmailOTP" });
      }

      const newEmail = tokenData?.payload;
      if (!newEmail) {
        throw new BadRequestError({ message: "Invalid verification code", name: "VerifyCurrentEmailOTP" });
      }

      // Re-check availability — someone else may have claimed this email since the request was issued
      const existingUser = await userDAL.findOne({ username: newEmail }, tx);
      if (existingUser) {
        throw new BadRequestError({ message: "Email is no longer available", name: "VerifyCurrentEmailOTP" });
      }

      // Step 2 of 2: now that current-email control is proven, send OTP to the NEW address
      const newEmailOtpCode = await tokenService.createTokenForUser({
        type: TokenType.TOKEN_EMAIL_CHANGE_OTP,
        userId,
        payload: newEmail
      });

      await smtpService.sendMail({
        template: SmtpTemplates.EmailVerification,
        subjectLine: "Infisical email change verification",
        recipients: [newEmail],
        substitutions: {
          code: newEmailOtpCode
        }
      });

      return { success: true, newEmail };
    });
  };

  const updateUserEmail = async ({
    userId,
    newEmail: unsanitizedEmail,
    otpCode
  }: TUpdateUserEmailDTO & { otpCode: string }) => {
    const newEmail = sanitizeEmail(unsanitizedEmail);
    validateEmail(newEmail);

    const changedUser = await userDAL.transaction(async (tx) => {
      const user = await userDAL.findById(userId, tx);
      if (!user) throw new NotFoundError({ message: `User with ID '${userId}' not found`, name: "UpdateUserEmail" });

      if (user.authMethods?.includes(AuthMethod.LDAP)) {
        throw new BadRequestError({ message: "Cannot update email for LDAP users", name: "UpdateUserEmail" });
      }

      const hasScimRestriction = await checkUserScimRestriction(userId, tx);
      if (hasScimRestriction) {
        throw new BadRequestError({
          message: "You are part of an organization that has SCIM enabled, and email changes are not allowed",
          name: "UpdateUserEmail"
        });
      }

      // Validate OTP and get the new email from token aliasId field
      let tokenData;
      try {
        tokenData = await tokenService.validateTokenForUser({
          type: TokenType.TOKEN_EMAIL_CHANGE_OTP,
          userId,
          code: otpCode
        });
      } catch (error) {
        throw new BadRequestError({ message: "Invalid verification code", name: "UpdateUserEmail" });
      }

      // Verify the new email matches what was stored in payload
      const tokenNewEmail = tokenData?.payload;
      if (!tokenNewEmail || tokenNewEmail !== newEmail.toLowerCase()) {
        throw new BadRequestError({ message: "Invalid verification code", name: "UpdateUserEmail" });
      }

      // Final check if another user has this email
      const existingUser = await userDAL.findOne({ username: newEmail }, tx);
      if (existingUser) {
        throw new BadRequestError({ message: "Email is no longer available", name: "UpdateUserEmail" });
      }

      // Delete all user aliases since the email is changing
      await userAliasDAL.delete({ userId }, tx);

      // Ensure EMAIL auth method is included if not already present
      const currentAuthMethods = user.authMethods || [];
      const updatedAuthMethods = currentAuthMethods.includes(AuthMethod.EMAIL)
        ? currentAuthMethods
        : [...currentAuthMethods, AuthMethod.EMAIL];

      const updatedUser = await userDAL.updateById(
        userId,
        {
          email: newEmail.toLowerCase(),
          username: newEmail.toLowerCase(),
          authMethods: updatedAuthMethods
        },
        tx
      );

      // Revoke all sessions to force re-login
      await tokenService.revokeAllMySessions(userId);

      return updatedUser;
    });
    return changedUser;
  };

  const getAllMyAccounts = async (email: string, userId: string) => {
    const users = await userDAL.findAllMyAccounts(email);
    return users?.map((el) => ({ ...el, isMyAccount: el.id === userId }));
  };

  const removeMyDuplicateAccounts = async (email: string, userId: string) => {
    const users = await userDAL.find({ email });
    const duplicatedAccounts = users?.filter((el) => el.id !== userId);
    const myAccount = users?.find((el) => el.id === userId);
    if (!duplicatedAccounts.length || !myAccount) return;

    const duplicateUserIds = duplicatedAccounts.map((el) => el.id);

    // Orgs that end up with nobody attached once the duplicates are gone get deleted too:
    // they are unreachable afterwards (this is how auto-created "Personal Org"s used to pile
    // up as orphans). Subscription state comes over HTTP, so it is resolved before the
    // transaction; orgs with a live paid subscription (or an unverifiable one) are kept and
    // logged instead of silently cancelling something the person may still want.
    const affectedRootOrgIds = await orgDAL.findRootOrgIdsForUsers(duplicateUserIds);
    const protectedOrgIds = await getOrgIdsWithLivePaidSubscription(affectedRootOrgIds, licenseClient);

    await userDAL.transaction(async (tx) => {
      // Same lock the last-admin guards take, so concurrent membership changes in these orgs
      // serialize against this sweep.
      for await (const orgId of [...affectedRootOrgIds].sort()) {
        await tx.raw("SELECT pg_advisory_xact_lock(?)", [PgSqlLock.LastAdminGuard("org", orgId)]);
      }

      await userDAL.delete({ $in: { id: duplicateUserIds } }, tx);
      await userDAL.updateById(userId, { username: (myAccount.email || myAccount.username).toLowerCase() }, tx);

      await fnDeleteOrphanedRootOrgs({
        candidateRootOrgIds: affectedRootOrgIds,
        protectedOrgIds,
        logContext: "removeMyDuplicateAccounts",
        orgDAL,
        licenseService,
        tx
      });
    });
  };

  const getMe = async (userId: string) => {
    const user = await userDAL.findUserEncKeyByUserId(userId);
    if (!user) throw new NotFoundError({ message: `User with ID '${userId}' not found`, name: "GetMe" });

    return {
      ...user,
      hashedPassword: null,
      encryptionVersion: 2
    };
  };

  /**
   * Classifies, per org tree the user belongs to, what deleting their account would do.
   * Fails closed when a subscription state cannot be verified: the caller (endpoint or
   * deleteUser) must not proceed on unknown billing state.
   */
  const getAccountDeletionImpact = async (userId: string): Promise<TAccountDeletionOrgImpact[]> => {
    const impactRows = await orgDAL.getUserOrgDeletionImpact(userId);

    const result: TAccountDeletionOrgImpact[] = [];
    for await (const row of impactRows) {
      const type = classifyOrgDeletionImpact(row);
      let subscriptionToCancel = false;
      if (type === AccountDeletionOrgImpactType.OrgDeleted) {
        try {
          subscriptionToCancel = await hasLivePaidSubscription(row.orgId, licenseClient);
        } catch (error) {
          logger.error(error, `getAccountDeletionImpact: failed to fetch subscription state [orgId=${row.orgId}]`);
          throw new InternalServerError({
            message: `Could not verify the subscription state of organization "${row.orgName}". Please try again later.`
          });
        }
      }
      result.push({
        orgId: row.orgId,
        orgName: row.orgName,
        type,
        otherMemberCount: row.otherMemberCount,
        identityCount: row.identityCount,
        subOrgCount: row.subOrgCount,
        subscriptionToCancel
      });
    }
    return result;
  };

  const deleteUser = async (userId: string) => {
    // If the deleting user is the only remaining server admin, block self-deletion.
    // The super_admin table's `initialized` flag is not reset on user delete, so
    // letting the last super admin self-delete leaves /admin/signup permanently
    // redirecting to /login — the instance becomes unrecoverable without direct
    // DB intervention (#6091). The super-admin-service.deleteUser path enforces
    // the same guard for admin-initiated deletes; this mirrors it for self-delete.
    const userToDelete = await userDAL.findById(userId);

    if (userToDelete?.superAdmin) {
      const superAdmins = await userDAL.find({ superAdmin: true });
      if (superAdmins.length === 1 && superAdmins[0].id === userId) {
        throw new BadRequestError({
          message:
            "Cannot delete the only server admin on this instance. Promote another user to server admin before deleting this account."
        });
      }
    }

    // First pass outside the transaction (subscription lookups are HTTP and must not run while
    // holding locks); the structural classification is re-derived under locks below.
    const impact = await getAccountDeletionImpact(userId);
    const blockedOrgs = impact.filter((el) => el.type === AccountDeletionOrgImpactType.BlockedLastAdmin);
    if (blockedOrgs.length) {
      throw new BadRequestError({ message: buildLastAdminBlockedMessage(blockedOrgs.map((el) => el.orgName)) });
    }

    const user = await userDAL.transaction(async (tx) => {
      // Same advisory lock the remove-member / change-role guards take, so the classification
      // cannot go stale against concurrent membership changes in these orgs. Sorted to keep the
      // lock order deterministic across concurrent deletions sharing orgs.
      const knownOrgIds = impact.map((el) => el.orgId).sort();
      for await (const orgId of knownOrgIds) {
        await tx.raw("SELECT pg_advisory_xact_lock(?)", [PgSqlLock.LastAdminGuard("org", orgId)]);
      }

      const lockedImpactRows = await orgDAL.getUserOrgDeletionImpact(userId, tx);
      const lockedBlocked = lockedImpactRows.filter(
        (row) => classifyOrgDeletionImpact(row) === AccountDeletionOrgImpactType.BlockedLastAdmin
      );
      if (lockedBlocked.length) {
        throw new BadRequestError({ message: buildLastAdminBlockedMessage(lockedBlocked.map((el) => el.orgName)) });
      }

      const orgsToDelete = lockedImpactRows.filter(
        (row) => classifyOrgDeletionImpact(row) === AccountDeletionOrgImpactType.OrgDeleted
      );
      for await (const org of orgsToDelete) {
        // Cancel any live v2 subscription at period end (no further charges; reversible on the
        // license server until the period lapses). Attempted for every org being deleted so a
        // classification change since the pre-check can't slip a live subscription through.
        // Benign failures: 4xx = nothing to cancel; "not configured" = v1/self-hosted instance
        // (v1 teardown happens via removeOrgCustomer inside fnHardDeleteOrganization).
        try {
          await licenseClient.cancelSubscription(org.orgId);
          logger.info(`deleteUser: cancelled subscription of org deleted with account [orgId=${org.orgId}]`);
        } catch (error) {
          const isBenign =
            error instanceof BadRequestError ||
            (error instanceof Error && error.message.includes("license client backend is not configured"));
          if (!isBenign) throw error;
        }

        await fnHardDeleteOrganization(org.orgId, { orgDAL, licenseService }, tx);
        logger.info(`deleteUser: deleted org orphaned by account deletion [orgId=${org.orgId}] [userId=${userId}]`);
      }

      return userDAL.deleteById(userId, tx);
    });

    // Seat counts of surviving orgs are license-server state; sync is best-effort and must not
    // undo an already-committed account deletion.
    const survivingOrgIds = impact
      .filter((el) => el.type === AccountDeletionOrgImpactType.MembershipRemoved)
      .map((el) => el.orgId);
    for await (const orgId of survivingOrgIds) {
      try {
        await licenseService.updateSubscriptionOrgMemberCount(orgId);
      } catch (error) {
        logger.error(error, `deleteUser: failed to sync org member count after deletion [orgId=${orgId}]`);
      }
    }

    try {
      if (user?.email) {
        // Send email to user to confirm account deletion
        await smtpService.sendMail({
          template: SmtpTemplates.AccountDeletionConfirmation,
          subjectLine: "Your Infisical account has been deleted",
          recipients: [user.email],
          substitutions: {
            email: user.email
          }
        });
      }
    } catch (error) {
      logger.error(error, `Failed to send account deletion confirmation email to ${user.email}`);
    }

    return user;
  };

  // user actions operations
  const createUserAction = async (userId: string, action: string) => {
    const userAction = await userDAL.transaction(async (tx) => {
      const existingAction = await userDAL.findOneUserAction({ action, userId }, tx);
      if (existingAction) return existingAction;
      return userDAL.createUserAction({ action, userId }, tx);
    });

    return userAction;
  };

  const getUserAction = async (userId: string, action: string) => {
    const userAction = await userDAL.findOneUserAction({ action, userId });
    return userAction;
  };

  const unlockUser = async (userId: string, token: string) => {
    await tokenService.validateTokenForUser({
      userId,
      code: token,
      type: TokenType.TOKEN_USER_UNLOCK
    });

    await userDAL.update(
      { id: userId },
      { consecutiveFailedMfaAttempts: 0, isLocked: false, temporaryLockDateEnd: null }
    );
  };

  const getUserProjectFavorites = async (userId: string, orgId: string) => {
    const orgMemberships = await orgDAL.findEffectiveOrgMemberships({
      actorType: ActorType.USER,
      actorId: userId,
      orgId
    });

    if (!orgMemberships.length) {
      throw new ForbiddenRequestError({
        message: "User does not belong in the organization."
      });
    }

    // Project favorites are stored on the user's direct membership row; group-only members have no favorites
    const directMembership = orgMemberships.find((m) => m.actorUserId === userId);
    const projectFavorites = directMembership?.projectFavorites ?? [];
    return { projectFavorites };
  };

  const updateUserProjectFavorites = async (userId: string, orgId: string, projectIds: string[]) => {
    const orgMemberships = await orgDAL.findEffectiveOrgMemberships({
      actorType: ActorType.USER,
      actorId: userId,
      orgId
    });

    if (!orgMemberships.length) {
      throw new ForbiddenRequestError({
        message: "User does not belong in the organization."
      });
    }

    const directMembership = orgMemberships.find((m) => m.actorUserId === userId);
    if (!directMembership) {
      throw new ForbiddenRequestError({
        message: "Project favorites can only be updated when you have direct membership in the organization."
      });
    }

    const matchingUserProjectMemberships = await membershipUserDAL.find({
      scope: AccessScope.Project,
      scopeOrgId: orgId,
      actorUserId: userId,
      $in: {
        scopeProjectId: projectIds
      }
    });

    const memberProjectFavorites = matchingUserProjectMemberships.map(
      (projectMembership) => projectMembership.scopeProjectId as string
    );

    const updatedOrgMembership = await membershipUserDAL.updateById(directMembership.id, {
      projectFavorites: memberProjectFavorites
    });

    return updatedOrgMembership.projectFavorites;
  };

  const listUserGroups = async ({ username, actorOrgId, actor, actorId, actorAuthMethod }: TListUserGroupsDTO) => {
    // akhilmhdh: case sensitive email resolution
    const user = await userDAL.findOne({ username });

    if (!user) throw new NotFoundError({ name: `User with username '${username}' not found` });

    // This makes it so the user can always read information about themselves, but no one else if they don't have the Members Read permission.
    if (user.id !== actorId) {
      const { permission } = await permissionService.getOrgPermission({
        actor,
        actorId,
        orgId: actorOrgId,
        actorAuthMethod,
        actorOrgId,
        scope: OrganizationActionScope.Any
      });
      ForbiddenError.from(permission).throwUnlessCan(OrgPermissionActions.Read, OrgPermissionSubjects.Member);
    }

    const memberships = await groupProjectDAL.findByUserId(user.id, actorOrgId);
    return memberships;
  };

  return {
    sendEmailVerificationCode,
    updateUserMfa,
    updateUserName,
    updateAuthMethods,
    requestEmailChangeOTP,
    verifyCurrentEmailOTP,
    updateUserEmail,
    getAccountDeletionImpact,
    deleteUser,
    getMe,
    createUserAction,
    listUserGroups,
    getUserAction,
    unlockUser,
    getAllMyAccounts,
    getUserProjectFavorites,
    removeMyDuplicateAccounts,
    updateUserProjectFavorites
  };
};
