import { faBan } from "@fortawesome/free-solid-svg-icons";
import { EyeIcon } from "lucide-react";

import { EmptyState, Spinner, Tooltip } from "@app/components/v2";
import { Badge } from "@app/components/v3";
import { useGetIdentityLdapAuth } from "@app/hooks/api";

import { IdentityAuthFieldDisplay, IdentityAuthLockoutFields } from "../helpers";
import { ViewAuthMethodProps } from "../types";

export const IdentityLdapAuthContent = ({ identityId }: ViewAuthMethodProps) => {
  const { data, isPending } = useGetIdentityLdapAuth(identityId);

  if (isPending) {
    return (
      <div className="flex w-full items-center justify-center py-6">
        <Spinner className="text-mineshaft-400" />
      </div>
    );
  }

  if (!data) {
    return (
      <EmptyState icon={faBan} title="Could not find LDAP Auth associated with this Identity." />
    );
  }

  return (
    <>
      <IdentityAuthFieldDisplay label="Access Token TTL (seconds)">
        {data.accessTokenTTL}
      </IdentityAuthFieldDisplay>
      <IdentityAuthFieldDisplay label="Access Token Max TTL (seconds)">
        {data.accessTokenMaxTTL}
      </IdentityAuthFieldDisplay>
      <IdentityAuthFieldDisplay label="Access Token Max Number of Uses">
        {data.accessTokenNumUsesLimit}
      </IdentityAuthFieldDisplay>
      <IdentityAuthFieldDisplay label="Access Token Trusted IPs">
        {data.accessTokenTrustedIps.map((ip) => ip.ipAddress).join(", ")}
      </IdentityAuthFieldDisplay>
      <IdentityAuthFieldDisplay label="LDAP URL">{data.url}</IdentityAuthFieldDisplay>
      <IdentityAuthFieldDisplay label="Bind DN">{data.bindDN}</IdentityAuthFieldDisplay>
      <IdentityAuthFieldDisplay label="Bind Pass">
        <Tooltip
          side="right"
          className="max-w-xl p-2"
          content={<p className="rounded-sm bg-mineshaft-600 p-2 break-words">{data.bindPass}</p>}
        >
          <Badge variant="neutral">
            <EyeIcon />
            Reveal
          </Badge>
        </Tooltip>
      </IdentityAuthFieldDisplay>
      <IdentityAuthFieldDisplay label="Search Base / DN">
        {data.searchBase}
      </IdentityAuthFieldDisplay>
      <IdentityAuthFieldDisplay label="Search Filter">{data.searchFilter}</IdentityAuthFieldDisplay>
      <IdentityAuthFieldDisplay label="CA Certificate">
        {data.ldapCaCertificate && (
          <Tooltip
            side="right"
            className="max-w-xl p-2"
            content={
              <p className="rounded-sm bg-mineshaft-600 p-2 break-words">
                {data.ldapCaCertificate}
              </p>
            }
          >
            <Badge variant="neutral">
              <EyeIcon />
              Reveal
            </Badge>
          </Tooltip>
        )}
      </IdentityAuthFieldDisplay>
      <IdentityAuthFieldDisplay label="Lockout">
        {data.lockoutEnabled ? "Enabled" : "Disabled"}
      </IdentityAuthFieldDisplay>
      {data.lockoutEnabled && <IdentityAuthLockoutFields data={data} />}
    </>
  );
};
