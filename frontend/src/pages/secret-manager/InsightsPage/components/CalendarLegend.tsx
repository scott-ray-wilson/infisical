export const CalendarLegend = () => {
  return (
    <div className="flex items-center gap-4">
      <div className="flex items-center gap-1.5">
        <span className="size-2.5 rounded-full bg-blue-500" />
        <span className="text-sm text-gray-300">Rotation</span>
      </div>
      <div className="flex items-center gap-1.5">
        <span className="size-2.5 rounded-full bg-amber-400" />
        <span className="text-sm text-gray-300">Expiry</span>
      </div>
    </div>
  );
};
