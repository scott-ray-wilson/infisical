import { faBan } from "@fortawesome/free-solid-svg-icons";

import { EmptyState, Spinner } from "@app/components/v2";
import { useGetIdentityTokenAuth, useGetIdentityTokensTokenAuth } from "@app/hooks/api";

import { IdentityAuthFieldDisplay, IdentityTokenAuthTokensTable } from "../helpers";
import { ViewAuthMethodProps } from "../types";

export const IdentityTokenAuthContent = ({ identityId }: ViewAuthMethodProps) => {
  const { data, isPending } = useGetIdentityTokenAuth(identityId);
  const { data: tokens = [], isPending: tokensPending } = useGetIdentityTokensTokenAuth(identityId);

  if (isPending || tokensPending) {
    return (
      <div className="flex w-full items-center justify-center py-6">
        <Spinner className="text-mineshaft-400" />
      </div>
    );
  }

  if (!data) {
    return (
      <EmptyState icon={faBan} title="Could not find Token Auth associated with this Identity." />
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
      <IdentityTokenAuthTokensTable tokens={tokens} identityId={identityId} />
    </>
  );
};
