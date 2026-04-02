import { useState } from "react";
import { Helmet } from "react-helmet";

import { Sheet, SheetContent, SheetHeader, SheetTitle, Skeleton } from "@app/components/v3";
import { useProject } from "@app/context";
import { useGetCalendarInsights } from "@app/hooks/api";

import {
  CalendarEvent,
  CalendarEventDetail,
  CalendarGrid,
  CalendarHeader,
  CalendarLegend
} from "./components";

export const InsightsPage = () => {
  const { currentProject, projectId } = useProject();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);

  const month = currentMonth.getMonth() + 1;
  const year = currentMonth.getFullYear();
  const environments = (currentProject?.environments ?? []).map((e) => e.slug).join(",");

  const { data, isPending } = useGetCalendarInsights(
    { projectId, month, year, environments },
    { enabled: !!environments }
  );

  return (
    <>
      <Helmet>
        <title>Insights</title>
      </Helmet>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <CalendarHeader currentMonth={currentMonth} onMonthChange={setCurrentMonth} />
          <CalendarLegend />
        </div>

        {isPending ? (
          <div className="space-y-2">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-[600px] w-full" />
          </div>
        ) : (
          <CalendarGrid
            currentMonth={currentMonth}
            rotations={data?.rotations ?? []}
            reminders={data?.reminders ?? []}
            onEventClick={setSelectedEvent}
          />
        )}
      </div>

      <Sheet open={!!selectedEvent} onOpenChange={() => setSelectedEvent(null)}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Event Details</SheetTitle>
          </SheetHeader>
          <div className="mt-4">
            {selectedEvent && <CalendarEventDetail event={selectedEvent} />}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
};
