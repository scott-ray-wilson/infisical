import { useQuery } from "@tanstack/react-query";

import { apiRequest } from "@app/config/request";

import { TAnnouncement } from "./types";

export const announcementKeys = {
  all: ["announcement"] as const,
  latest: () => [...announcementKeys.all, "latest"] as const
};

export const useGetLatestAnnouncement = (enabled = true) => {
  return useQuery({
    queryKey: announcementKeys.latest(),
    queryFn: async () => {
      const {
        data: { announcement }
      } = await apiRequest.get<{ announcement: TAnnouncement | null }>(
        "/api/v1/announcement/latest"
      );
      return announcement;
    },
    // TODO: restore staleTime: 5 * 60 * 1000 before merge — disabled during development
    // so Contentful changes show up on every navigation/refetch without a hard reload.
    staleTime: 0,
    enabled
  });
};
