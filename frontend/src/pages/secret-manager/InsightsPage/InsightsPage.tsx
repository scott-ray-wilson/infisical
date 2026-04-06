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
      <div className="mt-6 flex gap-6">
        <SecretAccessChart />
        <WorldMap />
      </div>
      <div className="mt-6 flex gap-6">
        <CalendarCard />
        <AuthMethodChart />
      </div>
    </>
  );
};
