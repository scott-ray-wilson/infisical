import { buildLastAdminBlockedMessage, classifyOrgDeletionImpact } from "./user-fns";
import { AccountDeletionOrgImpactType } from "./user-types";

describe("classifyOrgDeletionImpact", () => {
  test("org with nobody else attached is deleted with the account", () => {
    expect(classifyOrgDeletionImpact({ otherMemberCount: 0, otherAdminCount: 0, userIsActiveAdmin: true })).toBe(
      AccountDeletionOrgImpactType.OrgDeleted
    );
  });

  test("org with nobody else attached is deleted even when the user is not an admin", () => {
    // e.g. the user's own membership was deactivated but nobody else ever joined
    expect(classifyOrgDeletionImpact({ otherMemberCount: 0, otherAdminCount: 0, userIsActiveAdmin: false })).toBe(
      AccountDeletionOrgImpactType.OrgDeleted
    );
  });

  test("blocks when others remain and the user is the last active admin", () => {
    expect(classifyOrgDeletionImpact({ otherMemberCount: 3, otherAdminCount: 0, userIsActiveAdmin: true })).toBe(
      AccountDeletionOrgImpactType.BlockedLastAdmin
    );
  });

  test("a pending invite counts as a remaining member and blocks a sole admin", () => {
    // otherMemberCount includes invited/deactivated rows by design
    expect(classifyOrgDeletionImpact({ otherMemberCount: 1, otherAdminCount: 0, userIsActiveAdmin: true })).toBe(
      AccountDeletionOrgImpactType.BlockedLastAdmin
    );
  });

  test("membership is simply removed when another admin remains", () => {
    expect(classifyOrgDeletionImpact({ otherMemberCount: 5, otherAdminCount: 1, userIsActiveAdmin: true })).toBe(
      AccountDeletionOrgImpactType.MembershipRemoved
    );
  });

  test("membership is simply removed when the user is not an active admin", () => {
    // an already admin-less org is not made worse by this deletion; do not block
    expect(classifyOrgDeletionImpact({ otherMemberCount: 2, otherAdminCount: 0, userIsActiveAdmin: false })).toBe(
      AccountDeletionOrgImpactType.MembershipRemoved
    );
  });
});

describe("buildLastAdminBlockedMessage", () => {
  test("single org message names the org", () => {
    expect(buildLastAdminBlockedMessage(["Acme"])).toBe(
      'Deleting your account would leave the organization "Acme" without an admin. Promote another admin, or delete the organization first.'
    );
  });

  test("multiple orgs message lists all names", () => {
    expect(buildLastAdminBlockedMessage(["Acme", "Globex"])).toBe(
      'Deleting your account would leave the organizations "Acme", "Globex" without an admin. Promote other admins, or delete these organizations first.'
    );
  });
});
