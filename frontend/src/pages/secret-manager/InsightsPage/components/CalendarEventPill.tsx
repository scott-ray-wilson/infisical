import { BellIcon, RefreshCwIcon } from "lucide-react";

import { Badge } from "@app/components/v3/generic/Badge";
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
  const isRotation = event.type === "rotation";

  return (
    <Badge
      asChild
      className="justify-start"
      variant={isRotation ? "info" : "warning"}
      isFullWidth
      isTruncatable
    >
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onClick(event);
        }}
        title={label}
      >
        {isRotation ? <RefreshCwIcon /> : <BellIcon />}
        <span>{label}</span>
      </button>
    </Badge>
  );
};
