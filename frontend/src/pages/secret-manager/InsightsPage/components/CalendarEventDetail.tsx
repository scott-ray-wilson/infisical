import { Link, useParams } from "@tanstack/react-router";
import { format } from "date-fns";
import { ExternalLink } from "lucide-react";

import { Badge } from "@app/components/v3";

import { CalendarEvent } from "./CalendarEventPill";

const DetailRow = ({ label, value }: { label: string; value: string }) => (
  <div className="flex justify-between">
    <span className="text-sm text-gray-400">{label}</span>
    <span className="text-sm text-white">{value}</span>
  </div>
);

const getDateString = (event: CalendarEvent): string => {
  if (event.type === "rotation") {
    if (!event.data.nextRotationAt) return "N/A";
    return format(new Date(event.data.nextRotationAt), "MMM d, yyyy 'at' h:mm a");
  }
  return format(new Date(event.data.nextReminderDate), "MMM d, yyyy");
};

export const CalendarEventDetail = ({ event }: { event: CalendarEvent }) => {
  const { orgId, projectId } = useParams({
    strict: false,
    select: (p) => ({
      orgId: (p as Record<string, string>).orgId,
      projectId: (p as Record<string, string>).projectId
    })
  });

  const isRotation = event.type === "rotation";
  const title = isRotation ? event.data.name : event.data.secretKey;
  const dateStr = getDateString(event);
  const { environment, secretPath } = event.data;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h3 className="text-lg font-semibold text-white">{title}</h3>
        <div className="mt-1">
          <Badge variant={isRotation ? "info" : "warning"}>
            {isRotation ? "Rotation" : "Reminder"}
          </Badge>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <DetailRow label="Date" value={dateStr} />
        <DetailRow label="Environment" value={environment} />
        <DetailRow label="Path" value={secretPath} />

        {isRotation && (
          <>
            <DetailRow
              label="Interval"
              value={`Every ${event.data.rotationInterval} day${event.data.rotationInterval !== 1 ? "s" : ""}`}
            />
            <DetailRow label="Status" value={event.data.rotationStatus ?? "Active"} />
            <DetailRow label="Secret Keys" value={event.data.secretKeys.join(", ") || "—"} />
          </>
        )}

        {!isRotation && (
          <>
            {event.data.message && <DetailRow label="Message" value={event.data.message} />}
            {event.data.repeatDays && (
              <DetailRow
                label="Repeat"
                value={`Every ${event.data.repeatDays} day${event.data.repeatDays !== 1 ? "s" : ""}`}
              />
            )}
          </>
        )}
      </div>

      <Link
        to="/organizations/$orgId/projects/secret-management/$projectId/overview"
        params={{ orgId: orgId!, projectId: projectId! }}
        search={{ secretPath }}
        className="inline-flex items-center gap-1.5 text-sm text-primary-400 hover:text-primary-300"
      >
        <ExternalLink className="size-3.5" />
        View in Overview
      </Link>
    </div>
  );
};
