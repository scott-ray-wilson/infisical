import { isToday } from "date-fns";

import { CalendarEvent, CalendarEventPill } from "./CalendarEventPill";

const MAX_VISIBLE_EVENTS = 3;

export const CalendarDayCell = ({
  date,
  isCurrentMonth,
  events,
  onEventClick
}: {
  date: Date;
  isCurrentMonth: boolean;
  events: CalendarEvent[];
  onEventClick: (event: CalendarEvent) => void;
}) => {
  const today = isToday(date);
  const dayNum = date.getDate();
  const visibleEvents = events.slice(0, MAX_VISIBLE_EVENTS);
  const overflowCount = events.length - MAX_VISIBLE_EVENTS;

  return (
    <div
      className={`min-h-[130px] border border-border p-2 ${
        isCurrentMonth ? "bg-card" : "bg-background opacity-40"
      }`}
    >
      <div className="mb-1">
        {today ? (
          <span className="inline-flex size-7 items-center justify-center rounded-full bg-muted text-sm font-medium text-foreground">
            {dayNum}
          </span>
        ) : (
          <span className="text-sm text-gray-400">{dayNum}</span>
        )}
      </div>
      <div className="flex flex-col gap-1">
        {visibleEvents.map((event) => (
          <CalendarEventPill
            key={`${event.type}-${event.data.id}`}
            event={event}
            onClick={onEventClick}
          />
        ))}
        {overflowCount > 0 && <span className="text-xs text-gray-500">+{overflowCount} more</span>}
      </div>
    </div>
  );
};
