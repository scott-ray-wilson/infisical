import { addMonths, format, subMonths } from "date-fns";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";

export const CalendarHeader = ({
  currentMonth,
  onMonthChange
}: {
  currentMonth: Date;
  onMonthChange: (date: Date) => void;
}) => {
  return (
    <div className="flex items-center gap-4">
      <CalendarDays className="size-5 text-gray-400" />
      <h2 className="text-lg font-medium text-white">Rotation & Expiry Calendar</h2>
      <div className="ml-4 flex items-center gap-2">
        <button
          type="button"
          onClick={() => onMonthChange(subMonths(currentMonth, 1))}
          className="rounded p-1 text-gray-400 hover:bg-mineshaft-600 hover:text-white"
        >
          <ChevronLeft className="size-4" />
        </button>
        <span className="min-w-[140px] text-center text-sm font-medium text-white">
          {format(currentMonth, "MMMM yyyy")}
        </span>
        <button
          type="button"
          onClick={() => onMonthChange(addMonths(currentMonth, 1))}
          className="rounded p-1 text-gray-400 hover:bg-mineshaft-600 hover:text-white"
        >
          <ChevronRight className="size-4" />
        </button>
      </div>
    </div>
  );
};
