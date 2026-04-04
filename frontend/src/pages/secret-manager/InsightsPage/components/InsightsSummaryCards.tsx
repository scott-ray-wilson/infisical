import { Link, useParams } from "@tanstack/react-router";
import { formatDistanceToNow, parseISO } from "date-fns";
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
import { Popover, PopoverContent, PopoverTrigger } from "@app/components/v3/generic/Popover";
import { cn } from "@app/components/v3/utils";
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
  items?: React.ReactNode;
};

const StatCard = ({
  title,
  icon,
  iconVariant,
  count,
  subtitle,
  footnote,
  footnoteVariant,
  items
}: StatCardProps) => {
  const hasItems = items && count > 0;

  const card = (
    <UnstableCard
      className={cn(
        "flex-1",
        hasItems && "cursor-pointer transition-colors hover:bg-container-hover"
      )}
    >
      <UnstableCardHeader>
        <UnstableCardTitle>{title}</UnstableCardTitle>
        <UnstableCardAction>
          <div
            className={cn(
              "flex size-9 items-center justify-center rounded-md border [&>svg]:size-5",
              iconVariant === "info" && "border-info/15 bg-info/10 text-info",
              iconVariant === "warning" && "border-warning/15 bg-warning/10 text-warning",
              iconVariant === "danger" && "border-danger/15 bg-danger/10 text-danger"
            )}
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

  if (!hasItems) return card;

  return (
    <Popover>
      <PopoverTrigger className="flex-1 text-left">{card}</PopoverTrigger>
      <PopoverContent className="w-96" align="start">
        {items}
      </PopoverContent>
    </Popover>
  );
};

const overviewRoute =
  "/organizations/$orgId/projects/secret-management/$projectId/overview" as const;

const RotationList = ({
  items,
  orgId,
  projectId
}: {
  items: { name: string; environment: string; nextRotationAt: string | null }[];
  orgId: string;
  projectId: string;
}) => (
  <div className="flex flex-col gap-1">
    {items.map((item) => (
      <Link
        key={`${item.name}-${item.environment}`}
        to={overviewRoute}
        params={{ orgId, projectId }}
        search={{ search: item.name, environments: [item.environment], filterBy: "rotation" }}
        className="flex items-center gap-2 rounded-md p-1.5 transition-colors hover:bg-foreground/10"
      >
        <Badge variant="info" isSquare>
          <RefreshCwIcon />
        </Badge>
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm">{item.name}</div>
          <div className="text-xs text-label">{item.environment}</div>
        </div>
      </Link>
    ))}
  </div>
);

const ReminderList = ({
  items,
  orgId,
  projectId
}: {
  items: { secretKey: string; environment: string; nextReminderDate: string }[];
  orgId: string;
  projectId: string;
}) => (
  <div className="flex flex-col gap-1">
    {items.map((item) => (
      <Link
        key={`${item.secretKey}-${item.environment}`}
        to={overviewRoute}
        params={{ orgId, projectId }}
        search={{ search: item.secretKey, environments: [item.environment], filterBy: "secret" }}
        className="flex items-center gap-2 rounded-md p-1.5 transition-colors hover:bg-foreground/10"
      >
        <Badge variant="warning" isSquare>
          <BellIcon />
        </Badge>
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm">{item.secretKey}</div>
          <div className="text-xs text-label">{item.environment}</div>
        </div>
      </Link>
    ))}
  </div>
);

const StaleSecretList = ({
  items,
  orgId,
  projectId
}: {
  items: { key: string; environment: string; updatedAt: string }[];
  orgId: string;
  projectId: string;
}) => (
  <div className="flex flex-col gap-1">
    {items.map((item) => (
      <Link
        key={`${item.key}-${item.environment}`}
        to={overviewRoute}
        params={{ orgId, projectId }}
        search={{ search: item.key, environments: [item.environment], filterBy: "secret" }}
        className="flex items-center gap-2 rounded-md p-1.5 transition-colors hover:bg-foreground/10"
      >
        <Badge variant="danger" isSquare>
          <ClockIcon />
        </Badge>
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm">{item.key}</div>
          <div className="text-xs text-label">
            {item.environment} —{" "}
            {formatDistanceToNow(parseISO(item.updatedAt), { addSuffix: true })}
          </div>
        </div>
      </Link>
    ))}
  </div>
);

export const InsightsSummaryCards = () => {
  const { currentProject, projectId } = useProject();
  const { orgId } = useParams({
    strict: false,
    select: (p) => ({ orgId: (p as Record<string, string>).orgId })
  });
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

  const upcomingRotations = data?.upcomingRotations ?? [];
  const overdueRotations = data?.overdueRotations ?? [];
  const upcomingReminders = data?.upcomingReminders ?? [];
  const overdueReminders = data?.overdueReminders ?? [];
  const staleSecrets = data?.staleSecrets ?? [];

  return (
    <div className="flex gap-6">
      <StatCard
        title="Upcoming Rotations"
        icon={<RefreshCwIcon />}
        iconVariant="info"
        count={upcomingRotations.length}
        subtitle="In the next 7 days"
        footnote={
          overdueRotations.length ? `${overdueRotations.length} overdue` : "No overdue rotations"
        }
        footnoteVariant={overdueRotations.length ? "danger" : "success"}
        items={
          <RotationList
            items={[...overdueRotations, ...upcomingRotations]}
            orgId={orgId}
            projectId={projectId}
          />
        }
      />
      <StatCard
        title="Upcoming Reminders"
        icon={<BellIcon />}
        iconVariant="warning"
        count={upcomingReminders.length}
        subtitle="In the next 7 days"
        footnote={
          overdueReminders.length ? `${overdueReminders.length} overdue` : "No overdue reminders"
        }
        footnoteVariant={overdueReminders.length ? "danger" : "success"}
        items={
          <ReminderList
            items={[...overdueReminders, ...upcomingReminders]}
            orgId={orgId}
            projectId={projectId}
          />
        }
      />
      <StatCard
        title="Stale Secrets"
        icon={<ClockIcon />}
        iconVariant="danger"
        count={staleSecrets.length}
        subtitle="Unused > 90 days"
        footnote={
          staleSecrets.length
            ? `${staleSecrets.length} need${staleSecrets.length === 1 ? "s" : ""} review`
            : "All secrets up to date"
        }
        footnoteVariant={staleSecrets.length ? "warning" : "success"}
        items={<StaleSecretList items={staleSecrets} orgId={orgId} projectId={projectId} />}
      />
    </div>
  );
};
