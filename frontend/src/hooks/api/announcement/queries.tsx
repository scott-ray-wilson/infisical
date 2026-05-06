import { useQuery } from "@tanstack/react-query";

import { apiRequest } from "@app/config/request";

import { TRecentAnnouncementsResponse } from "./types";

export const announcementKeys = {
  all: ["announcement"] as const,
  recent: () => [...announcementKeys.all, "recent"] as const
};

export const useGetRecentAnnouncements = (enabled = true) => {
  return useQuery({
    queryKey: announcementKeys.recent(),
    queryFn: async () => {
      const { data } = await apiRequest.get<TRecentAnnouncementsResponse>(
        "/api/v1/announcement/recent"
      );
      return data;
    },
    // TODO: restore staleTime: 5 * 60 * 1000 before merge — disabled during development
    // so Contentful changes show up on every navigation/refetch without a hard reload.
    staleTime: 0,
    enabled
  });
};
