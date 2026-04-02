import { useQuery, UseQueryOptions } from "@tanstack/react-query";

import { apiRequest } from "@app/config/request";

import { TGetCalendarInsightsDTO, TGetCalendarInsightsResponse } from "./types";

export const secretInsightsKeys = {
  all: () => ["secret-insights"] as const,
  calendarEvents: (params: TGetCalendarInsightsDTO) =>
    [...secretInsightsKeys.all(), "calendar-events", params] as const
};

export const useGetCalendarInsights = (
  params: TGetCalendarInsightsDTO,
  options?: Omit<
    UseQueryOptions<
      TGetCalendarInsightsResponse,
      unknown,
      TGetCalendarInsightsResponse,
      ReturnType<typeof secretInsightsKeys.calendarEvents>
    >,
    "queryKey" | "queryFn"
  >
) => {
  return useQuery({
    queryKey: secretInsightsKeys.calendarEvents(params),
    queryFn: async () => {
      const { data } = await apiRequest.get<TGetCalendarInsightsResponse>(
        "/api/v1/dashboard/secret-insights-calendar",
        { params }
      );
      return data;
    },
    ...options
  });
};
