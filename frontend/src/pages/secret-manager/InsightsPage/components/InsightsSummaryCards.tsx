import { BellIcon, ClockIcon, RefreshCwIcon } from "lucide-react";

import { Skeleton } from "@app/components/v3";
import { useProject } from "@app/context";
import { useGetInsightsSummary } from "@app/hooks/api";

type StatCardProps = {
  title: string;
  icon: React.ReactNode;
  iconColorClass: string;
  count: number;
  subtitle: string;
  footnote: string;
  footnoteColorClass: string;
};

const StatCard = ({
  title,
  icon,
  iconColorClass,
  count,
  subtitle,
  footnote,
  footnoteColorClass
}: StatCardProps) => (
  <div className="flex flex-1 flex-col gap-3 rounded-lg border border-border bg-container p-4">
    <div className="flex items-center justify-between">
      <span className="text-sm font-medium">{title}</span>
      <div className={`flex size-8 items-center justify-center rounded-md border border-border ${iconColorClass}`}>
        {icon}
      </div>
    </div>
    <div>
      <span className="text-2xl font-semibold">{count}</span>
      <span className="ml-2 text-sm text-label">{subtitle}</span>
    </div>
    <div className="border-t border-border pt-2">
      <span className={`text-xs font-medium ${footnoteColorClass}`}>{footnote}</span>
    </div>
  </div>
);

export const InsightsSummaryCards = () => {
  const { currentProject, projectId } = useProject();
  const environments = (currentProject?.environments ?? []).map((e) => e.slug).join(",");

  const { data, isPending } = useGetInsightsSummary(
    { projectId, environments },
    { enabled: !!environments }
  );

  if (isPending) {
    return (
      <div className="flex gap-4">
        <Skeleton className="h-[130px] flex-1" />
        <Skeleton className="h-[130px] flex-1" />
        <Skeleton className="h-[130px] flex-1" />
      </div>
    );
  }

  return (
    <div className="flex gap-4">
      <StatCard
        title="Stale Secrets"
        icon={<ClockIcon className="size-4" />}
        iconColorClass="text-warning"
        count={data?.staleSecrets ?? 0}
        subtitle="Unused > 90 days"
        footnote={
          data?.staleSecrets
            ? `${data.staleSecrets} need${data.staleSecrets === 1 ? "s" : ""} review`
            : "All secrets up to date"
        }
        footnoteColorClass={data?.staleSecrets ? "text-warning" : "text-success"}
      />
      <StatCard
        title="Upcoming Rotations"
        icon={<RefreshCwIcon className="size-4" />}
        iconColorClass="text-info"
        count={data?.upcomingRotations ?? 0}
        subtitle="In the next 7 days"
        footnote={
          data?.overdueRotations
            ? `${data.overdueRotations} overdue`
            : "No overdue rotations"
        }
        footnoteColorClass={data?.overdueRotations ? "text-danger" : "text-success"}
      />
      <StatCard
        title="Upcoming Reminders"
        icon={<BellIcon className="size-4" />}
        iconColorClass="text-warning"
        count={data?.upcomingReminders ?? 0}
        subtitle="In the next 7 days"
        footnote={
          data?.overdueReminders
            ? `${data.overdueReminders} overdue`
            : "No overdue reminders"
        }
        footnoteColorClass={data?.overdueReminders ? "text-danger" : "text-success"}
      />
    </div>
  );
};
