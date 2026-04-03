import { isToday } from "date-fns";

import { CalendarEventPill } from "./CalendarEventPill";
import { CalendarEvent } from "./types";

const MAX_VISIBLE_EVENTS = 3;

const getBgClass = (today: boolean, isCurrentMonth: boolean) => {
  if (today) return isCurrentMonth ? "bg-muted/5" : "bg-card/50";
  return isCurrentMonth ? "bg-container" : "bg-card";
};

export const CalendarDayCell = ({
  date,
  isCurrentMonth,
  events
}: {
  date: Date;
  isCurrentMonth: boolean;
  events: CalendarEvent[];
}) => {
  const today = isToday(date);
  const dayNum = date.getDate();
  const visibleEvents = events.slice(0, MAX_VISIBLE_EVENTS);
  const overflowCount = events.length - MAX_VISIBLE_EVENTS;

  return (
    <div
      className={`min-h-[80px] border border-border p-2 transition-colors duration-75 hover:bg-container-hover ${getBgClass(
        today,
        isCurrentMonth
      )}`}
    >
      <div className="mb-1">
        {today ? (
          <span className="inline-flex size-7 items-center justify-center rounded border border-border bg-muted/35 text-sm font-medium text-foreground">
            {dayNum}
          </span>
        ) : (
          <span className="text-sm text-label">{dayNum}</span>
        )}
      </div>
      <div className="flex flex-col gap-1">
        {visibleEvents.map((event) => (
          <CalendarEventPill key={`${event.type}-${event.data.id}`} event={event} />
        ))}
        {/* TODO: CHECK */}
        {overflowCount > 0 && <span className="text-xs text-gray-500">+{overflowCount} more</span>}
      </div>
    </div>
  );
};
