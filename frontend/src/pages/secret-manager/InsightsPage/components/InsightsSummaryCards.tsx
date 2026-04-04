import { AlertTriangleIcon, BellIcon, CheckIcon, ClockIcon, RefreshCwIcon } from "lucide-react";

import {
  Badge,
  Skeleton,
  UnstableCard,
  UnstableCardAction,
  UnstableCardContent,
  UnstableCardHeader,
  UnstableCardTitle,
  UnstableSeparator
} from "@app/components/v3";
import { useProject } from "@app/context";
import { useGetInsightsSummary } from "@app/hooks/api";

type StatCardProps = {
  title: string;
  icon: React.ReactNode;
  iconVariant: "warning" | "info" | "danger";
  count: number;
  subtitle: string;
  footnote: string;
  footnoteVariant: "warning" | "danger" | "success";
};

const StatCard = ({
  title,
  icon,
  iconVariant,
  count,
  subtitle,
  footnote,
  footnoteVariant
}: StatCardProps) => (
  <UnstableCard className="flex-1">
    <UnstableCardHeader>
      <UnstableCardTitle>{title}</UnstableCardTitle>
      <UnstableCardAction>
        <div
          className={`flex size-9 items-center justify-center rounded-md border border-${iconVariant}/25 bg-${iconVariant}/10 text-${iconVariant} [&>svg]:size-5`}
        >
          {icon}
        </div>
      </UnstableCardAction>
    </UnstableCardHeader>
    <UnstableCardContent className="flex flex-col gap-3">
      <div>
        <span className="text-2xl font-semibold">{count}</span>
        <span className="ml-2 text-sm text-muted">{subtitle}</span>
      </div>
      <UnstableSeparator />
      <Badge variant={footnoteVariant}>
        {footnoteVariant === "success" ? <CheckIcon /> : <AlertTriangleIcon />}
        {footnote}
      </Badge>
    </UnstableCardContent>
  </UnstableCard>
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
      <div className="flex gap-6">
        <Skeleton className="h-[130px] flex-1" />
        <Skeleton className="h-[130px] flex-1" />
        <Skeleton className="h-[130px] flex-1" />
      </div>
    );
  }

  return (
    <div className="flex gap-6">
      <StatCard
        title="Upcoming Rotations"
        icon={<RefreshCwIcon />}
        iconVariant="info"
        count={data?.upcomingRotations ?? 0}
        subtitle="In the next 7 days"
        footnote={
          data?.overdueRotations ? `${data.overdueRotations} overdue` : "No overdue rotations"
        }
        footnoteVariant={data?.overdueRotations ? "danger" : "success"}
      />
      <StatCard
        title="Upcoming Reminders"
        icon={<BellIcon />}
        iconVariant="warning"
        count={data?.upcomingReminders ?? 0}
        subtitle="In the next 7 days"
        footnote={
          data?.overdueReminders ? `${data.overdueReminders} overdue` : "No overdue reminders"
        }
        footnoteVariant={data?.overdueReminders ? "danger" : "success"}
      />
      <StatCard
        title="Stale Secrets"
        icon={<ClockIcon />}
        iconVariant="danger"
        count={data?.staleSecrets ?? 0}
        subtitle="Unused > 90 days"
        footnote={
          data?.staleSecrets
            ? `${data.staleSecrets} need${data.staleSecrets === 1 ? "s" : ""} review`
            : "All secrets up to date"
        }
        footnoteVariant={data?.staleSecrets ? "warning" : "success"}
      />
    </div>
  );
};
