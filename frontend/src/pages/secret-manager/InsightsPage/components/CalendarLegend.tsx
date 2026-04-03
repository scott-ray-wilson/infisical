export const CalendarLegend = () => {
  return (
    <div className="flex items-center gap-4">
      <div className="flex items-center gap-1.5">
        <span className="size-2.5 rounded-full bg-info" />
        <span className="text-sm text-muted">Rotation</span>
      </div>
      <div className="flex items-center gap-1.5">
        <span className="size-2.5 rounded-full bg-warning" />
        <span className="text-sm text-muted">Reminder</span>
      </div>
    </div>
  );
};
