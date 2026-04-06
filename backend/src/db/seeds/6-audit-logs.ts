import crypto from "crypto";

import { Knex } from "knex";

import { TableName } from "../schemas";
import { seedData1 } from "../seed-data";

const randomUUID = () => crypto.randomUUID();

// Public IPs that resolve to real locations via geoip-lite
const PUBLIC_IPS = [
  "157.240.1.35", // US
  "212.58.244.4", // GB (London)
  "85.214.132.117", // DE (Berlin)
  "200.155.0.1", // BR (São Paulo)
  "211.234.0.1", // KR (Seoul)
  "49.44.0.1", // IN
  "24.48.0.1", // CA (Montreal)
  "126.107.170.0", // JP
  "203.2.218.0", // AU
  "189.203.200.1" // MX
];

const USER_AGENTS: { ua: string; type: string }[] = [
  { ua: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)", type: "web" },
  { ua: "infisical-cli/0.28.1", type: "cli" },
  { ua: "InfisicalNodeSDK/3.0.0", type: "InfisicalNodeSDK" },
  { ua: "InfisicalPythonSDK/2.1.0", type: "InfisicalPythonSDK" },
  { ua: "infisical-k8-operator/0.7.0", type: "k8-operator" },
  { ua: "HashiCorp/1.0 Terraform/1.9.0", type: "terraform" }
];

const AUTH_METHODS = [
  "email",
  "google",
  "github",
  "gitlab",
  "okta-saml",
  "azure-saml",
  "ldap",
  "oidc"
];

const IDENTITY_CONFIGS = [
  { name: "k8s-operator", auth: { kubernetes: { namespace: "infisical", name: "operator-sa" } } },
  { name: "ci-pipeline", auth: {} }, // Universal Auth (no specific auth field)
  { name: "aws-lambda-prod", auth: { aws: { accountId: "123456789012", arn: "arn:aws:iam::role/lambda", userId: "AROA12345", partition: "aws", service: "sts", resourceType: "role", resourceName: "lambda-prod" } } },
  { name: "gcp-cloud-run", auth: {} },
  { name: "oidc-github-actions", auth: { oidc: { claims: { sub: "repo:org/repo:ref:refs/heads/main" } } } },
  { name: "token-auth-bot", auth: {} }
];

const SECRET_KEYS = ["DATABASE_URL", "API_KEY", "AWS_SECRET_KEY", "STRIPE_KEY", "REDIS_URL", "JWT_SECRET", "SMTP_PASSWORD", "SENTRY_DSN"];

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomDate(daysBack: number): Date {
  const now = Date.now();
  const offset = Math.floor(Math.random() * daysBack * 24 * 60 * 60 * 1000);
  return new Date(now - offset);
}

// Override with env var or fall back to seedData1
const TARGET_PROJECT_ID = process.env.SEED_PROJECT_ID || seedData1.project.id;

export async function seed(knex: Knex): Promise<void> {
  // Look up org and project name from the DB
  const project = await knex("projects").where({ id: TARGET_PROJECT_ID }).first();
  const orgId = project?.orgId || seedData1.organization.id;
  const projectName = project?.name || seedData1.project.name;

  // Delete existing seeded audit logs for this project
  await knex(TableName.AuditLog).where({ projectId: TARGET_PROJECT_ID }).del();

  const expiresAt = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000);
  // eslint-disable-next-line
  // @ts-ignore - seed data doesn't need strict insert types
  const rows: any[] = [];

  // --- User access logs (varied auth methods, IPs, user agents) ---
  for (let i = 0; i < 400; i += 1) {
    const authMethod = pickRandom(AUTH_METHODS);
    const ip = Math.random() < 0.3 ? "127.0.0.1" : pickRandom(PUBLIC_IPS);
    const agent = pickRandom(USER_AGENTS);
    const created = randomDate(30);
    const isMulti = Math.random() < 0.6;

    rows.push({
      id: randomUUID(),
      actor: "user",
      actorMetadata: JSON.stringify({
        userId: seedData1.id,
        username: seedData1.username,
        email: seedData1.email,
        authMethod
      }),
      eventType: isMulti ? "get-secrets" : "get-secret",
      eventMetadata: JSON.stringify(
        isMulti
          ? { environment: "dev", secretPath: "/", numberOfSecrets: Math.ceil(Math.random() * 20) }
          : {
              environment: pickRandom(["dev", "staging", "prod"]),
              secretPath: "/",
              secretId: randomUUID(),
              secretKey: pickRandom(SECRET_KEYS),
              secretVersion: 1
            }
      ),
      ipAddress: ip,
      userAgent: agent.ua,
      userAgentType: agent.type,
      orgId,
      projectId: TARGET_PROJECT_ID,
      projectName,
      createdAt: created,
      updatedAt: created,
      expiresAt
    });
  }

  // --- Identity access logs (varied identity types, auth mechanisms, IPs) ---
  for (let i = 0; i < 450; i += 1) {
    const identity = pickRandom(IDENTITY_CONFIGS);
    const ip = Math.random() < 0.4 ? "127.0.0.1" : pickRandom(PUBLIC_IPS);
    const agent = pickRandom(USER_AGENTS.slice(1)); // skip web browser for identities
    const created = randomDate(30);
    const isMulti = Math.random() < 0.7;

    rows.push({
      id: randomUUID(),
      actor: "identity",
      actorMetadata: JSON.stringify({
        identityId: seedData1.machineIdentity.id,
        name: identity.name,
        ...identity.auth
      }),
      eventType: isMulti ? "get-secrets" : "get-secret",
      eventMetadata: JSON.stringify(
        isMulti
          ? { environment: pickRandom(["dev", "staging", "prod"]), secretPath: "/", numberOfSecrets: Math.ceil(Math.random() * 30) }
          : {
              environment: pickRandom(["dev", "staging", "prod"]),
              secretPath: "/",
              secretId: randomUUID(),
              secretKey: pickRandom(SECRET_KEYS),
              secretVersion: 1
            }
      ),
      ipAddress: ip,
      userAgent: agent.ua,
      userAgentType: agent.type,
      orgId,
      projectId: TARGET_PROJECT_ID,
      projectName,
      createdAt: created,
      updatedAt: created,
      expiresAt
    });
  }

  // --- Service token access logs ---
  for (let i = 0; i < 50; i += 1) {
    const ip = Math.random() < 0.5 ? "127.0.0.1" : pickRandom(PUBLIC_IPS);
    const created = randomDate(30);

    rows.push({
      id: randomUUID(),
      actor: "service",
      actorMetadata: JSON.stringify({
        serviceId: randomUUID(),
        name: pickRandom(["deploy-token", "ci-read-token", "backup-svc"])
      }),
      eventType: "get-secrets",
      eventMetadata: JSON.stringify({
        environment: pickRandom(["dev", "staging", "prod"]),
        secretPath: "/",
        numberOfSecrets: Math.ceil(Math.random() * 15)
      }),
      ipAddress: ip,
      userAgent: pickRandom(USER_AGENTS).ua,
      userAgentType: "other",
      orgId,
      projectId: TARGET_PROJECT_ID,
      projectName,
      createdAt: created,
      updatedAt: created,
      expiresAt
    });
  }

  // Insert in batches of 100
  for (let i = 0; i < rows.length; i += 100) {
    await knex(TableName.AuditLog).insert(rows.slice(i, i + 100));
  }
}
