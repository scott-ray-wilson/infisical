import { Helmet } from "react-helmet";
import { useTranslation } from "react-i18next";
import { useNavigate, useSearch } from "@tanstack/react-router";

import { ProjectPermissionCan } from "@app/components/permissions";
import { Badge, Tab, TabList, TabPanel, Tabs } from "@app/components/v2";
import { ROUTE_PATHS } from "@app/const/routes";
import { ProjectPermissionActions, ProjectPermissionSub, useWorkspace } from "@app/context";
import { IntegrationsListPageTabs } from "@app/types/integrations";

import {
  FrameworkIntegrationTab,
  InfrastructureIntegrationTab,
  NativeIntegrationsTab,
  SecretSyncsTab
} from "./components";

export const IntegrationsListPage = () => {
  const navigate = useNavigate();
  const { currentWorkspace } = useWorkspace();
  const { t } = useTranslation();

  const { selectedTab } = useSearch({
    from: ROUTE_PATHS.SecretManager.IntegrationsListPage.id
  });

  const updateSelectedTab = (tab: string) => {
    navigate({
      to: ROUTE_PATHS.SecretManager.IntegrationsListPage.path,
      search: (prev) => ({ ...prev, selectedTab: tab }),
      params: {
        projectId: currentWorkspace.id
      }
    });
  };

  return (
    <>
      <Helmet>
        <title>{t("common.head-title", { title: t("integrations.title") })}</title>
        <meta property="og:image" content="/images/message.png" />
        <meta property="og:title" content="Manage your .env files in seconds" />
        <meta name="og:description" content={t("integrations.description") as string} />
      </Helmet>
      <div className="container relative mx-auto max-w-7xl pb-12 text-white">
        <div className="mx-6 mb-8">
          <div className="mb-4 mt-6 flex flex-col items-start justify-between px-2 text-xl">
            <h1 className="text-3xl font-semibold">Integrations</h1>
            <p className="text-base text-bunker-300">
              Manage integrations with third-party services.
            </p>
          </div>
          <Tabs value={selectedTab} onValueChange={updateSelectedTab}>
            <TabList>
              <Tab value={IntegrationsListPageTabs.SecretSyncs}>
                Secret Syncs
                <Badge variant="primary" className="ml-1 cursor-pointer text-xs">
                  New
                </Badge>
              </Tab>
              <Tab value={IntegrationsListPageTabs.NativeIntegrations}>Native Integrations</Tab>
              <Tab value={IntegrationsListPageTabs.FrameworkIntegrations}>
                Framework Integrations
              </Tab>
              <Tab value={IntegrationsListPageTabs.InfrastructureIntegrations}>
                Infrastructure Integrations
              </Tab>
            </TabList>
            <TabPanel value={IntegrationsListPageTabs.SecretSyncs}>
              <ProjectPermissionCan
                renderGuardBanner
                passThrough={false}
                I={ProjectPermissionActions.Read}
                a={ProjectPermissionSub.SecretSyncs}
              >
                <SecretSyncsTab />
              </ProjectPermissionCan>
            </TabPanel>
            <TabPanel value={IntegrationsListPageTabs.NativeIntegrations}>
              <ProjectPermissionCan
                renderGuardBanner
                passThrough={false}
                I={ProjectPermissionActions.Read}
                a={ProjectPermissionSub.Integrations}
              >
                <NativeIntegrationsTab />
              </ProjectPermissionCan>
            </TabPanel>
            <TabPanel value={IntegrationsListPageTabs.FrameworkIntegrations}>
              <FrameworkIntegrationTab />
            </TabPanel>
            <TabPanel value={IntegrationsListPageTabs.InfrastructureIntegrations}>
              <InfrastructureIntegrationTab />
            </TabPanel>
          </Tabs>
        </div>
      </div>
    </>
  );
};
