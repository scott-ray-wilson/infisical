import { useQuery } from "@tanstack/react-query";

import { apiRequest } from "@app/config/request";

import { TAnnouncement } from "./types";

export const announcementKeys = {
  all: ["announcement"] as const,
  recent: () => [...announcementKeys.all, "recent"] as const
};

export const useGetRecentAnnouncements = (enabled = true) => {
  return useQuery({
    queryKey: announcementKeys.recent(),
    queryFn: async () => {
      const {
        data: { announcements }
      } = await apiRequest.get<{ announcements: TAnnouncement[] }>(
        "/api/v1/announcement/recent"
      );
      return announcements;
    },
    // TODO: restore staleTime: 5 * 60 * 1000 before merge — disabled during development
    // so Contentful changes show up on every navigation/refetch without a hard reload.
    staleTime: 0,
    enabled
  });
};
