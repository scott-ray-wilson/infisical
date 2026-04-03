import { useState } from "react";
import { Helmet } from "react-helmet";
import { addMonths, format, subMonths } from "date-fns";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  Skeleton,
  UnstableCard,
  UnstableCardAction,
  UnstableCardContent,
  UnstableCardHeader,
  UnstableCardTitle,
  UnstableIconButton
} from "@app/components/v3";
import { useProject } from "@app/context";
import { useGetCalendarInsights } from "@app/hooks/api";

import { CalendarEvent, CalendarEventDetail, CalendarGrid, CalendarLegend } from "./components";

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
      <UnstableCard>
        <UnstableCardHeader>
          <UnstableCardTitle>
            Rotation & Expiry Calendar
            <div className="ml-4 flex items-center gap-1">
              <UnstableIconButton
                variant="ghost"
                size="xs"
                onClick={() => setCurrentMonth((prev) => subMonths(prev, 1))}
              >
                <ChevronLeft className="size-4" />
              </UnstableIconButton>
              <span className="min-w-[140px] text-center text-sm font-medium">
                {format(currentMonth, "MMMM yyyy")}
              </span>
              <UnstableIconButton
                variant="ghost"
                size="xs"
                onClick={() => setCurrentMonth((prev) => addMonths(prev, 1))}
              >
                <ChevronRight className="size-4" />
              </UnstableIconButton>
            </div>
          </UnstableCardTitle>
          <UnstableCardAction>
            <CalendarLegend />
          </UnstableCardAction>
        </UnstableCardHeader>
        <UnstableCardContent>
          {isPending ? (
            <Skeleton className="h-[600px] w-full" />
          ) : (
            <CalendarGrid
              currentMonth={currentMonth}
              rotations={data?.rotations ?? []}
              reminders={data?.reminders ?? []}
              onEventClick={setSelectedEvent}
            />
          )}
        </UnstableCardContent>
      </UnstableCard>

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
