import { useQuery } from "@tanstack/react-query";

import { apiRequest } from "@app/config/request";
import { UserConsumerKeyPair } from "@app/hooks/api/consumer-keys/types";

const consumerKeyKeys = {
  getUserConsumerKey: (orgId: string) => ["consumer-key-pair", { orgId }] as const
};

export const fetchUserConsumerKey = async (orgId: string) => {
  const { data } = await apiRequest.get<UserConsumerKeyPair>(`/api/v1/consumer-keys/${orgId}`);

  return data;
};

export const useGetUserConsumerKey = (orgId: string) =>
  useQuery({
    queryKey: consumerKeyKeys.getUserConsumerKey(orgId),
    queryFn: () => fetchUserConsumerKey(orgId),
    enabled: Boolean(orgId)
  });
