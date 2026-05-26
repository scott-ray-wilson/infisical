import { faBan } from "@fortawesome/free-solid-svg-icons";
import { EyeIcon } from "lucide-react";

import { EmptyState, Spinner, Tooltip } from "@app/components/v2";
import { Badge } from "@app/components/v3";
import { useGetIdentityTlsCertAuth } from "@app/hooks/api";

import { IdentityAuthFieldDisplay } from "../helpers";
import { ViewAuthMethodProps } from "../types";

export const IdentityTlsCertAuthContent = ({ identityId }: ViewAuthMethodProps) => {
  const { data, isPending } = useGetIdentityTlsCertAuth(identityId);

  if (isPending) {
    return (
      <div className="flex w-full items-center justify-center py-6">
        <Spinner className="text-mineshaft-400" />
      </div>
    );
  }

  if (!data) {
    return (
      <EmptyState
        icon={faBan}
        title="Could not find TLS Certificate Auth associated with this Identity."
      />
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
      <IdentityAuthFieldDisplay className="col-span-2" label="CA Certificate">
        <Tooltip
          side="right"
          className="max-w-xl p-2"
          content={
            <p className="rounded-sm bg-mineshaft-600 p-2 break-words">{data.caCertificate}</p>
          }
        >
          <Badge variant="neutral">
            <EyeIcon />
            Reveal
          </Badge>
        </Tooltip>
      </IdentityAuthFieldDisplay>
      <IdentityAuthFieldDisplay className="col-span-2" label="Allowed Common Names">
        {data.allowedCommonNames
          ?.split(",")
          .map((cn) => cn.trim())
          .join(", ")}
      </IdentityAuthFieldDisplay>
    </>
  );
};
