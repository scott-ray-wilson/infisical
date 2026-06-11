# Local SSO Development (OIDC, LDAP, Active Directory)

This guide is for **contributors** who want to test Infisical's SSO flows against an
identity provider running locally in Docker. It covers the dev containers that ship
with `docker-compose.dev.yml`, their default credentials, what to enter in Infisical,
and how everything is pre-seeded so you can log in within a couple of minutes.

For the **end-user / production** setup of each provider, see the product docs instead:
[`docs/documentation/platform/sso`](docs/documentation/platform/sso) and
[`docs/documentation/platform/ldap`](docs/documentation/platform/ldap).

## Quick reference

| Provider | Bring up | Seed | Provider URL | Seeded users (password `password123!`) |
| --- | --- | --- | --- | --- |
| Keycloak (OIDC) | `make up-dev-oidc` | realm auto-imports on boot; configure Infisical with `make seed-dev-oidc` | http://localhost:8088 (admin / admin) | jdoe@infisical.com, asmith@infisical.com, oidc@infisical.com |
| OpenLDAP (LDAP) | `make up-dev-ldap` | `make seed-dev-ldap` | http://localhost:6433 (phpLDAPadmin) | jdoe, asmith |
| Samba (Active Directory) | `make up-dev-ad` | `make seed-dev-ad` | ldap://localhost:1389 | jdoe, asmith |
| PingFederate (SAML/OIDC/SCIM) | `make up-dev-pingfed` | n/a (manual) | https://localhost:9999 (administrator / 2FederateM0re) | n/a |

All compose profiles also start the default stack (Postgres, Redis, backend, frontend,
nginx), so Infisical is available at **http://localhost:8080**.

## Prerequisites (do this once)

1. **Base stack works.** You can already run `make up-dev` and reach Infisical at
   http://localhost:8080. Log in with the seeded account:

   | | |
   | --- | --- |
   | Email | `test@localhost.local` |
   | Password | `testInfisical@1` |
   | Organization | `infisical` (id `180870b7-f464-4740-8ffe-9d11c9245ea7`) |

   (Created by `backend/src/db/seeds`. Run `npm run seed-dev` from `backend/` if your DB is empty.)

2. **`AUTH_SECRET` and `SITE_URL` are set.** `.env.example` already ships a sample
   `AUTH_SECRET`. For SSO you must also make sure `SITE_URL` matches the URL you open
   Infisical at, because the OIDC callback is built as `{SITE_URL}/api/v1/sso/oidc/callback`.
   For the standard dev stack set:

   ```bash
   SITE_URL=http://localhost:8080
   ```


3. **Unlock the EE features** (next section). Without this every SSO config request returns
   `Upgrade plan to ...`.

## Unlocking SSO (EE feature gating)

OIDC, SAML, LDAP, SCIM, and groups are paid features. On a plain local instance there is no
license, so `getDefaultOnPremFeatures()` in
[`backend/src/ee/services/license/license-fns.ts`](backend/src/ee/services/license/license-fns.ts)
returns `oidcSSO: false` and `ldap: false`, and the config endpoints reject everything.
Pick one of:

- **Internal devs (recommended):** set a real or offline `LICENSE_KEY` in `backend/.env`
  (ask the team for a dev license). This mirrors a real enterprise instance.
- **OSS / no license:** temporarily flip the flags in `getDefaultOnPremFeatures()` to `true`
  for the features you are testing:

  ```ts
  oidcSSO: true,
  samlSSO: true,
  ldap: true,
  scim: true,
  groups: true,
  ```

  This is a **local-only change, do not commit it.**

Restart the backend after either change so the license service re-reads the plan.

> In case you lock yourself out after enforcing SSO, an org admin can always recover via the
> admin login portal at http://localhost:8080/login/admin.

---

## OIDC via Keycloak

```bash
make up-dev-oidc
```

Keycloak boots with the pre-seeded **`infisical`** realm imported from
[`docker/keycloak/realm-infisical.json`](docker/keycloak/realm-infisical.json): one OIDC
client and two users. The container has no volume, so the realm is re-imported fresh on
every start. To reload edits to the realm file, recreate it with `docker compose -f docker-compose.dev.yml --profile oidc up -d --force-recreate keycloak keycloak-config`.

A one-shot `keycloak-config` sidecar runs alongside it and sets the built-in `master` realm to
`sslRequired=none`, so the admin console works over plain HTTP. Without this, Keycloak returns
**"HTTPS required"** on Docker Desktop (the container sees a non-local client IP for the
`master` realm, whose default is `external`). The `infisical` realm already ships with
`sslRequired: none` in its realm file, so the login flow is unaffected either way.

### Default values

| Setting | Value |
| --- | --- |
| Admin console | http://localhost:8088 |
| Admin user / password | `admin` / `admin` |
| Realm | `infisical` |
| Client ID | `infisical-dev` |
| Client secret | `infisical-dev-client-secret` |
| JWT signature algorithm | `RS256` |
| Redirect URI (registered) | `http://localhost:8080/api/v1/sso/oidc/callback` |
| Seeded users | `jdoe@infisical.com`, `asmith@infisical.com`, `oidc@infisical.com` (password `password123!`) |

### Discovery URL (how the networking works)

Keycloak is configured so the **issuer** and the **browser-facing** endpoints (authorization,
logout) are always `http://localhost:8088`, while the **backchannel** calls the backend makes
(discovery, token, JWKS) use whatever URL it connected with. That split, set via
`KC_HOSTNAME=http://localhost:8088` + `KC_HOSTNAME_BACKCHANNEL_DYNAMIC=true` in
`docker-compose.dev.yml`, lets the backend and the browser share one issuer with **no `/etc/hosts`
edit**:

- **Backend in Docker (the default for `make up-dev-oidc`):** the backend fetches discovery over
  the internal compose network, and the browser is redirected to `localhost:8088`. Discovery URL:

  ```
  http://keycloak:8080/realms/infisical/.well-known/openid-configuration
  ```

- **Backend on the host** (`cd backend && npm run dev`, not in compose): use `localhost` for both
  sides:

  ```
  http://localhost:8088/realms/infisical/.well-known/openid-configuration
  ```

`make seed-dev-oidc` writes the in-Docker URL by default; pass `SEED_OIDC_DISCOVERY_URL=...` for the
host-backend case.

### Configure in Infisical

The fast path is to let the seed script do it. With the stack up, run:

```bash
make seed-dev-oidc
```

This bootstraps everything the Infisical side needs: an `oidc@infisical.com` admin (password
`password123!`), a **verified** `infisical.com` email domain (required for every SSO login), and
an **active** OIDC config pointing at the discovery URL above (client `infisical-dev`). With no
arguments it bootstraps a dedicated `oidc` org (slug `oidc`), creating it if missing; pass
`ORG_ID=<uuid>` to configure an existing org instead. SSO is still EE-gated, so make sure you have
unlocked the EE features first.

Then test the login two ways:

- **SSO:** open a fresh browser session at http://localhost:8080, choose **Continue with SSO**, and
  authenticate as any seeded Keycloak user (`jdoe@infisical.com`, `asmith@infisical.com`, or
  `oidc@infisical.com`), all `password123!`. Signing in as `oidc@infisical.com` links to the seeded
  Infisical admin. You can also start the flow directly at
  `http://localhost:8080/api/v1/sso/oidc/login?orgSlug=oidc`.
- **Password:** sign in as the seeded admin `oidc@infisical.com` / `password123!` to manage the
  `oidc` org directly.

<details>
<summary>Or configure it by hand in the UI</summary>

1. Log in to http://localhost:8080 as the seeded admin and open the organization's
   **Single Sign-On (SSO)** settings.
2. Connect **OIDC**, choose configuration type **Discovery URL**, and fill in:
   - **Discovery Document URL:** the URL from the section above.
   - **JWT Signature Algorithm:** `RS256`.
   - **Client ID:** `infisical-dev`.
   - **Client Secret:** `infisical-dev-client-secret`.
   - Leave **Allowed Email Domains** empty to accept any seeded user while testing.
3. Verify the org's `infisical.com` domain under the org domain settings, otherwise the login is
   rejected. `make seed-dev-oidc` does this for you.
4. Save, then enable OIDC.
</details>

---

## LDAP via OpenLDAP

```bash
make up-dev-ldap
make seed-dev-ldap   # adds OUs, users, and a group
```

OpenLDAP starts with only the base DN and admin entry. `make seed-dev-ldap` applies
[`docker/openldap/bootstrap.ldif`](docker/openldap/bootstrap.ldif) (users, group, OUs) over the
wire with `ldapadd -c`, so it is safe to re-run. Run it after the container is up.

Browse the directory at http://localhost:6433 (phpLDAPadmin) with login
`cn=admin,dc=acme,dc=com` / `admin`.

### Default values

| Field | Value (backend in Docker) | Value (backend on host) |
| --- | --- | --- |
| LDAP URL | `ldap://openldap:389` | `ldap://localhost:389` |
| Bind DN | `cn=admin,dc=acme,dc=com` | same |
| Bind password | `admin` | same |
| User search base | `ou=people,dc=acme,dc=com` | same |
| User search filter | `(uid={{username}})` | same |
| Unique user attribute | `uid` (or default `uidNumber`) | same |
| Group search base | `ou=groups,dc=acme,dc=com` | same |
| CA certificate | leave empty (`ldap://` has no TLS) | same |
| Seeded users | `jdoe`, `asmith` (password `password123!`) | same |
| Seeded group | `infisical-users` | same |

Unlike OIDC, LDAP has no browser redirect, so there is no issuer/hostname problem: the backend
binds to the server directly. Just point `LDAP URL` at wherever the backend can reach OpenLDAP.

### Configure in Infisical

1. In the org **Single Sign-On (SSO)** settings, connect **LDAP** and enter the values above.
2. Use **Test Connection** to confirm the bind works before saving.
3. Enable LDAP, then log in as `jdoe` / `password123!`. The seeded users' emails are `@infisical.com`,
   so verify that domain for the org you enabled LDAP on, otherwise the login is rejected:
   `make seed-dev-oidc ORG_ID=<that org>` (bare `make seed-dev-oidc` targets the dedicated `oidc` org).
4. (Optional) Map `cn=infisical-users` to an Infisical group under the LDAP config's group
   mappings to test group sync.

---

## Active Directory via Samba

A Samba 4 domain controller is available for AD-style LDAP, Kerberos, and SCIM testing. This
one is unchanged from before, documented here for completeness:

```bash
make up-dev-ad     # bootstraps the ACME.LOCAL domain (~60s on first start)
make seed-dev-ad   # creates users jdoe / asmith and group infisical-users
```

| Setting | Value |
| --- | --- |
| Domain | `ACME.LOCAL` (`dc=acme,dc=local`) |
| Admin | `Administrator` / `Passw0rd!` (override with `SAMBA_ADMIN_PASSWORD`) |
| LDAP URL (from host) | `ldap://localhost:1389` |
| LDAP URL (from compose) | `ldap://samba-ad:389` |
| Seeded users | `jdoe@infisical.com`, `asmith@infisical.com` (password `password123!`) |

Configure it in Infisical the same way as OpenLDAP, adjusting the URL and base DN
(`dc=acme,dc=local`) and using a bind DN such as `Administrator@acme.local`.

## PingFederate (SAML / OIDC / SCIM)

```bash
make up-dev-pingfed
```

Admin console at https://localhost:9999/pingfederate (`administrator` / `2FederateM0re`),
runtime at https://localhost:9031. It needs free Ping DevOps credentials
(`PING_IDENTITY_DEVOPS_USER` / `PING_IDENTITY_DEVOPS_KEY` in `.env`) or runs in trial mode.
The backend reaches it via the `pf.local` host alias (uncomment `NODE_TLS_REJECT_UNAUTHORIZED=0`
on the backend service to accept its self-signed cert in dev). PingFederate is not auto-seeded;
configure connections through its admin console.

---

## Testing without the UI (curl)

Grab a JWT by logging in to http://localhost:8080 and copying the `Authorization: Bearer ...`
header from any API request in your browser's network tab. Then:

```bash
JWT="<paste token>"
ORG_ID="180870b7-f464-4740-8ffe-9d11c9245ea7"
```

**Create the OIDC config:**

```bash
curl -X POST http://localhost:8080/api/v1/sso/oidc/config \
  -H "Authorization: Bearer $JWT" -H "Content-Type: application/json" \
  -d '{
    "organizationId": "'"$ORG_ID"'",
    "configurationType": "discoveryURL",
    "discoveryURL": "http://keycloak:8080/realms/infisical/.well-known/openid-configuration",
    "clientId": "infisical-dev",
    "clientSecret": "infisical-dev-client-secret",
    "jwtSignatureAlgorithm": "RS256",
    "isActive": true
  }'
```

**Create the LDAP config:**

```bash
curl -X POST http://localhost:8080/api/v1/sso/ldap/config \
  -H "Authorization: Bearer $JWT" -H "Content-Type: application/json" \
  -d '{
    "organizationId": "'"$ORG_ID"'",
    "isActive": true,
    "url": "ldap://openldap:389",
    "bindDN": "cn=admin,dc=acme,dc=com",
    "bindPass": "admin",
    "searchBase": "ou=people,dc=acme,dc=com",
    "searchFilter": "(uid={{username}})",
    "uniqueUserAttribute": "uid",
    "groupSearchBase": "ou=groups,dc=acme,dc=com"
  }'
```

**Test an LDAP bind** (the `ldapauth` strategy reads `username`/`password` from the body):

```bash
curl -X POST http://localhost:8080/api/v1/sso/ldap/login \
  -H "Content-Type: application/json" \
  -d '{ "organizationSlug": "infisical", "username": "jdoe", "password": "password123!" }'
```

A `200` with a `nextUrl` means the bind succeeded.

---

## Troubleshooting

| Symptom | Likely cause / fix |
| --- | --- |
| `Upgrade plan to create ... configuration` | EE features not unlocked. See [Unlocking SSO](#unlocking-sso-ee-feature-gating), then restart the backend. |
| OIDC fails with an issuer / `iss` mismatch | The issuer is pinned to `http://localhost:8088` via Keycloak's `KC_HOSTNAME`, so the seeded config shouldn't hit this. If you overrode the discovery URL, keep the backend reaching Keycloak over the compose network (`keycloak:8080`) and leave `KC_HOSTNAME` pointing at the host the browser uses (`localhost:8088`). |
| Redirected to a broken page after Keycloak login | `SITE_URL` does not match the app URL. Set `SITE_URL=http://localhost:8080`. |
| Backend cannot reach the discovery URL | Inside Docker `localhost:8088` is the backend itself. Use the internal compose address `http://keycloak:8080/...` for OIDC discovery (or `ldap://openldap:389` for LDAP). |
| Keycloak admin console (`localhost:8088`) shows "HTTPS required" | The built-in `master` realm defaults to `sslRequired=external`, which Docker Desktop's non-local client IP trips over plain HTTP. The one-shot `keycloak-config` sidecar flips it to `NONE` on every `up`; refresh once it logs `master realm sslRequired=NONE`. (The `infisical` realm is already `none`, so the login flow is unaffected.) |
| Keycloak realm/users missing after a restart | The container is ephemeral; recreate it with `docker compose -f docker-compose.dev.yml --profile oidc up -d --force-recreate keycloak keycloak-config`, or `make down` then `make up-dev-oidc`. |
| LDAP users missing | Run `make seed-dev-ldap` after the container is up (OpenLDAP starts empty). |
| Login rejected: email domain not in the org's accepted domains | The org has no verified domain matching the user's email. `make seed-dev-oidc` verifies `infisical.com` for the `oidc` org it bootstraps; use `make seed-dev-oidc ORG_ID=<org>` to verify it for another org. See [Email Domain Verification](docs/documentation/platform/email-domain). |
| Locked out after enforcing SSO | Recover via http://localhost:8080/login/admin. |
