import { TCalendarReminder, TCalendarRotation } from "@app/hooks/api/secretInsights/types";

export type CalendarEvent =
  | { type: "rotation"; data: TCalendarRotation }
  | { type: "reminder"; data: TCalendarReminder };

export const CalendarEventPill = ({
  event,
  onClick
}: {
  event: CalendarEvent;
  onClick: (event: CalendarEvent) => void;
}) => {
  const label = event.type === "rotation" ? event.data.name : event.data.secretKey;

  const colorClasses =
    event.type === "rotation"
      ? "border-blue-500/40 text-blue-400 bg-blue-500/10 hover:bg-blue-500/20"
      : "border-amber-400/40 text-amber-400 bg-amber-400/10 hover:bg-amber-400/20";

  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onClick(event);
      }}
      className={`w-full cursor-pointer truncate rounded border px-1.5 py-0.5 text-left text-xs transition-colors ${colorClasses}`}
      title={label}
    >
      {label}
    </button>
  );
};
