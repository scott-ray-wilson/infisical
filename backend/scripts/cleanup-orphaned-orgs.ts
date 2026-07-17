/* eslint-disable no-console, no-await-in-loop */
// One-time cleanup of orphaned organizations: root orgs with no user attached anywhere in their
// tree (no direct org membership row of any status and no user via a group), typically left
// behind by account deletions that predate the orphaned-org guards in user deletion flows.
//
// Usage (from backend/):
//   npm run cleanup:orphaned-orgs                      # dry run, prints the candidate list
//   npm run cleanup:orphaned-orgs -- --execute         # actually deletes
//   npm run cleanup:orphaned-orgs -- --execute --limit 50 --min-age-days 60
//
// Safety rails:
// - dry run by default; --execute required to delete anything
// - only root orgs older than --min-age-days (default 30) are considered
// - orgs with machine identities anywhere in the tree are skipped and reported (deleting them
//   would break running workloads even though no human can manage the org)
// - orgs with a live paid v2 subscription are skipped and reported; the check requires
//   LICENSE_SERVER_V2_URL + LICENSE_SERVER_V2_SERVICE_KEY in the environment. Without them the
//   script refuses to delete unless --skip-subscription-check is passed explicitly.
// - orgs with a v1 license customer (customerId) get the customer removed on the license server
//   when LICENSE_SERVER_URL + LICENSE_SERVER_KEY are configured; otherwise they are skipped.
import dotenv from "dotenv";
import knex from "knex";
import path from "path";

import { licenseServerBackend } from "../src/services/license-client/license-client-backends";

dotenv.config({ path: path.join(__dirname, "../.env.migration") });
dotenv.config({ path: path.join(__dirname, "../.env") });

const ORGANIZATION = "organizations";
const MEMBERSHIP = "memberships";
const USERS = "users";
const USER_GROUP_MEMBERSHIP = "user_group_membership";
const PROJECT = "projects";
const ORG_SCOPE = "organization";

// Mirrors LIVE_SUBSCRIPTION_STATUSES in src/services/org/org-fns.ts.
const LIVE_SUBSCRIPTION_STATUSES = ["active", "trialing", "past_due"];

const parseArgs = () => {
  const args = process.argv.slice(2);
  const readNumber = (flag: string, fallback: number) => {
    const idx = args.indexOf(flag);
    if (idx === -1) return fallback;
    const value = Number(args[idx + 1]);
    if (Number.isNaN(value) || value <= 0) {
      console.error(`Invalid value for ${flag}: ${args[idx + 1]}`);
      process.exit(1);
    }
    return value;
  };
  return {
    execute: args.includes("--execute"),
    skipSubscriptionCheck: args.includes("--skip-subscription-check"),
    limit: readNumber("--limit", 100),
    minAgeDays: readNumber("--min-age-days", 30)
  };
};

const main = async () => {
  const { execute, skipSubscriptionCheck, limit, minAgeDays } = parseArgs();

  if (!process.env.DB_CONNECTION_URI) {
    console.error("DB_CONNECTION_URI is not set");
    process.exit(1);
  }

  const v2Url = process.env.LICENSE_SERVER_V2_URL;
  const v2Key = process.env.LICENSE_SERVER_V2_SERVICE_KEY;
  const v2Backend = v2Url && v2Key ? licenseServerBackend(v2Url, v2Key.replace(/\\n/g, "\n")) : null;
  if (!v2Backend && !skipSubscriptionCheck) {
    console.error(
      "LICENSE_SERVER_V2_URL / LICENSE_SERVER_V2_SERVICE_KEY are not configured, so subscription state cannot be verified. Pass --skip-subscription-check to proceed without it (self-hosted / v1-only instances)."
    );
    process.exit(1);
  }

  const v1Url = process.env.LICENSE_SERVER_URL;
  const v1Key = process.env.LICENSE_SERVER_KEY;

  const db = knex({ client: "pg", connection: process.env.DB_CONNECTION_URI });

  try {
    const cutoff = new Date(Date.now() - minAgeDays * 24 * 60 * 60 * 1000);

    // Root orgs with no user attached anywhere in the tree: no direct org-scope membership row
    // of any status and no user via a group. Mirrors applyNoAttachedUsersFilter in org-dal.ts.
    const candidates: {
      id: string;
      name: string;
      slug: string;
      createdAt: Date;
      customerId: string | null;
    }[] = await db(`${ORGANIZATION} as o`)
      .whereNull("o.rootOrgId")
      .where("o.createdAt", "<", cutoff)
      .whereNotExists((qb) => {
        void qb
          .select(db.raw("1"))
          .from(`${MEMBERSHIP} as user_membership`)
          .join(`${ORGANIZATION} as member_org`, "member_org.id", "user_membership.scopeOrgId")
          .join(`${USERS} as member_user`, "member_user.id", "user_membership.actorUserId")
          .where("user_membership.scope", ORG_SCOPE)
          .where("member_user.isGhost", false)
          .whereRaw(`("member_org"."rootOrgId" = "o"."id" OR "member_org"."id" = "o"."id")`);
      })
      .whereNotExists((qb) => {
        void qb
          .select(db.raw("1"))
          .from(`${MEMBERSHIP} as group_membership`)
          .join(`${ORGANIZATION} as group_org`, "group_org.id", "group_membership.scopeOrgId")
          .join(`${USER_GROUP_MEMBERSHIP} as group_user_membership`, "group_user_membership.groupId", "group_membership.actorGroupId")
          .join(`${USERS} as group_user`, "group_user.id", "group_user_membership.userId")
          .where("group_membership.scope", ORG_SCOPE)
          .where("group_user.isGhost", false)
          .whereRaw(`("group_org"."rootOrgId" = "o"."id" OR "group_org"."id" = "o"."id")`);
      })
      .select("o.id", "o.name", "o.slug", "o.createdAt", "o.customerId")
      .orderBy("o.createdAt", "asc")
      .limit(limit);

    console.log(`Found ${candidates.length} orphaned root org(s) older than ${minAgeDays} day(s) (limit ${limit})\n`);
    if (!candidates.length) return;

    const candidateIds = candidates.map((el) => el.id);

    const identityRows: { rootId: string; count: string }[] = await db(`${MEMBERSHIP} as m`)
      .join(`${ORGANIZATION} as tree_org`, "tree_org.id", "m.scopeOrgId")
      .where("m.scope", ORG_SCOPE)
      .whereNotNull("m.actorIdentityId")
      .where((qb) => {
        void qb.whereIn("tree_org.id", candidateIds).orWhereIn("tree_org.rootOrgId", candidateIds);
      })
      .groupBy(db.raw(`COALESCE("tree_org"."rootOrgId", "tree_org"."id")`))
      .select(db.raw(`COALESCE("tree_org"."rootOrgId", "tree_org"."id") as "rootId"`))
      .countDistinct("m.actorIdentityId as count");
    const identitiesByOrg = Object.fromEntries(identityRows.map((el) => [el.rootId, Number(el.count)]));

    const projectRows: { rootId: string; count: string }[] = await db(`${PROJECT} as p`)
      .join(`${ORGANIZATION} as tree_org`, "tree_org.id", "p.orgId")
      .where((qb) => {
        void qb.whereIn("tree_org.id", candidateIds).orWhereIn("tree_org.rootOrgId", candidateIds);
      })
      .groupBy(db.raw(`COALESCE("tree_org"."rootOrgId", "tree_org"."id")`))
      .select(db.raw(`COALESCE("tree_org"."rootOrgId", "tree_org"."id") as "rootId"`))
      .count("p.id as count");
    const projectsByOrg = Object.fromEntries(projectRows.map((el) => [el.rootId, Number(el.count)]));

    let deleted = 0;
    let skippedIdentities = 0;
    let skippedSubscription = 0;
    let skippedV1Customer = 0;
    let failed = 0;

    for (const org of candidates) {
      const label = `${org.id} "${org.name}" (created ${org.createdAt.toISOString().slice(0, 10)}, projects=${projectsByOrg[org.id] ?? 0})`;

      const identityCount = identitiesByOrg[org.id] ?? 0;
      if (identityCount > 0) {
        skippedIdentities += 1;
        console.log(`SKIP (has ${identityCount} machine identit${identityCount === 1 ? "y" : "ies"}): ${label}`);
        continue;
      }

      if (v2Backend) {
        try {
          const subscription = await v2Backend.fetchSubscription(org.id);
          const isLivePaid =
            !!subscription &&
            LIVE_SUBSCRIPTION_STATUSES.includes(subscription.status.toLowerCase()) &&
            subscription.items.some((item) => item.plan.toLowerCase() !== "free");
          if (isLivePaid) {
            skippedSubscription += 1;
            console.log(`SKIP (live paid subscription, needs manual review): ${label}`);
            continue;
          }
        } catch (error) {
          skippedSubscription += 1;
          console.log(`SKIP (could not verify subscription: ${(error as Error).message}): ${label}`);
          continue;
        }
      }

      if (org.customerId && (!v1Url || !v1Key)) {
        skippedV1Customer += 1;
        console.log(`SKIP (v1 customer ${org.customerId} but no LICENSE_SERVER_URL/KEY to remove it): ${label}`);
        continue;
      }

      if (!execute) {
        console.log(`WOULD DELETE: ${label}`);
        deleted += 1;
        continue;
      }

      try {
        await db.transaction(async (tx) => {
          await tx.raw(`SET LOCAL statement_timeout = '300s'`);
          await tx(ORGANIZATION).where("id", org.id).delete();
        });

        if (org.customerId && v1Url && v1Key) {
          const res = await fetch(`${v1Url}/api/license-server/v1/customers/${org.customerId}`, {
            method: "DELETE",
            headers: { Authorization: `Bearer ${v1Key}` }
          });
          if (!res.ok) {
            console.log(`WARN: org deleted but v1 customer removal returned ${res.status} [customerId=${org.customerId}]`);
          }
        }

        deleted += 1;
        console.log(`DELETED: ${label}`);
      } catch (error) {
        failed += 1;
        console.error(`FAILED: ${label}: ${(error as Error).message}`);
      }
    }

    console.log(
      `\n${execute ? "Deleted" : "Would delete"} ${deleted}, skipped ${skippedIdentities} with identities, ${skippedSubscription} with subscription state, ${skippedV1Customer} with unremovable v1 customer, ${failed} failed.`
    );
    if (!execute) console.log("Dry run only. Re-run with --execute to delete.");
  } finally {
    await db.destroy();
  }
};

void main();
