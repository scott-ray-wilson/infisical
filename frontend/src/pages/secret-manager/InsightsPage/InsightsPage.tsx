import { Helmet } from "react-helmet";

import { PageHeader } from "@app/components/v2";
import { ProjectType } from "@app/hooks/api/projects/types";

import {
  AuthMethodChart,
  CalendarCard,
  InsightsSummaryCards,
  SecretAccessChart,
  WorldMap
} from "./components";

export const InsightsPage = () => {
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
      <InsightsSummaryCards />
      <div className="flex gap-6">
        <div className="mt-6 flex flex-[1.3] flex-col gap-6">
          <WorldMap />
          <CalendarCard />
        </div>
        <div className="mt-6 flex flex-1 flex-col gap-6">
          <SecretAccessChart />
          <AuthMethodChart />
        </div>
      </div>
    </>
  );
};
