import { useState } from "react";
import { Helmet } from "react-helmet";
import { addMonths, format, subMonths } from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { Lottie, PageHeader } from "@app/components/v2";
import {
  UnstableCard,
  UnstableCardAction,
  UnstableCardContent,
  UnstableCardDescription,
  UnstableCardHeader,
  UnstableCardTitle,
  UnstableIconButton
} from "@app/components/v3";
import { useProject } from "@app/context";
import { useGetCalendarInsights } from "@app/hooks/api";
import { ProjectType } from "@app/hooks/api/projects/types";

import { CalendarGrid, CalendarLegend, SecretAccessChart } from "./components";

export const InsightsPage = () => {
  const { currentProject, projectId } = useProject();
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const month = currentMonth.getMonth() + 1;
  const year = currentMonth.getFullYear();
  const environments = (currentProject?.environments ?? []).map((e) => e.slug).join(",");

  const { data, isPending } = useGetCalendarInsights(
    { projectId, month, year, environments },
    { enabled: !!environments }
  );

  return (
    <>
      <Helmet>
        <title>Insights</title>
      </Helmet>
      <PageHeader
        scope={ProjectType.SecretManager}
        title="Secret Insights"
        description="Monitor upcoming secret rotations and reminders across your project."
      />
      <div className="flex gap-8">
        <SecretAccessChart />
        <UnstableCard className="w-2xl">
          <UnstableCardHeader>
            <UnstableCardTitle>Rotation & Reminder Calendar</UnstableCardTitle>
            <UnstableCardDescription>
              View upcoming secret rotations and reminders
            </UnstableCardDescription>
            <UnstableCardAction>
              <div className="ml-4 flex items-center gap-1">
                <UnstableIconButton
                  variant="ghost"
                  size="xs"
                  onClick={() => setCurrentMonth((prev) => subMonths(prev, 1))}
                >
                  <ChevronLeft className="size-4" />
                </UnstableIconButton>
                <span className="min-w-[140px] text-center text-sm font-medium">
                  {format(currentMonth, "MMMM yyyy")}
                </span>
                <UnstableIconButton
                  variant="ghost"
                  size="xs"
                  onClick={() => setCurrentMonth((prev) => addMonths(prev, 1))}
                >
                  <ChevronRight className="size-4" />
                </UnstableIconButton>
              </div>
            </UnstableCardAction>
          </UnstableCardHeader>
          <UnstableCardContent>
            <div className="relative">
              <CalendarGrid
                currentMonth={currentMonth}
                rotations={data?.rotations ?? []}
                reminders={data?.reminders ?? []}
              />
              {isPending && (
                <div className="absolute inset-0 flex items-center justify-center bg-container/40">
                  <Lottie icon="infisical_loading_white" isAutoPlay className="w-16" />
                </div>
              )}
            </div>
            <CalendarLegend />
          </UnstableCardContent>
        </UnstableCard>
      </div>
    </>
  );
};
