import { useCallback, useEffect } from "react";
import { Helmet } from "react-helmet";
import { useTranslation } from "react-i18next";
import { useNavigate, useSearch } from "@tanstack/react-router";

import { createNotification } from "@app/components/notifications";
import { ProjectPermissionCan } from "@app/components/permissions";
import { Badge, ContentLoader, Tab, TabList, TabPanel, Tabs } from "@app/components/v2";
import { ROUTE_PATHS } from "@app/const/routes.ts";
import { ProjectPermissionActions, ProjectPermissionSub, useWorkspace } from "@app/context";
import {
  useDeleteIntegration,
  useDeleteIntegrationAuths,
  useGetCloudIntegrations,
  useGetWorkspaceAuthorizations,
  useGetWorkspaceIntegrations
} from "@app/hooks/api";
import { useListSecretSyncs } from "@app/hooks/api/secretSyncs";
import { IntegrationAuth } from "@app/hooks/api/types";
import { FrameworkIntegrationTab } from "@app/pages/secret-manager/IntegrationsListPage/components/FrameworkIntegrationTab";
import { InfrastructureIntegrationTab } from "@app/pages/secret-manager/IntegrationsListPage/components/InfrastructureIntegrationTab";
import {
  NativeIntegrationsTab,
  SecretSyncsTab
} from "@app/pages/secret-manager/IntegrationsListPage/components/IntegrationsTabs/components";
import { IntegrationsListPageTabs } from "@app/types/integrations.ts";

import { redirectForProviderAuth } from "./IntegrationsListPage.utils";

const Page = () => {
  const { currentWorkspace } = useWorkspace();
  const navigate = useNavigate();
  const { selectedTab } = useSearch({
    from: ROUTE_PATHS.SecretManager.IntegrationsListPage.id
  });
  const { environments, id: workspaceId } = currentWorkspace;

  const { data: cloudIntegrations, isPending: isCloudIntegrationsLoading } =
    useGetCloudIntegrations();

  const {
    data: integrationAuths,
    isPending: isIntegrationAuthLoading,
    isFetching: isIntegrationAuthFetching
  } = useGetWorkspaceAuthorizations(
    workspaceId,
    useCallback((data: IntegrationAuth[]) => {
      const groupBy: Record<string, IntegrationAuth> = {};
      data.forEach((el) => {
        groupBy[el.integration] = el;
      });
      return groupBy;
    }, [])
  );

  // mutation
  const {
    data: integrations,
    isPending: isIntegrationLoading,
    isFetching: isIntegrationFetching
  } = useGetWorkspaceIntegrations(workspaceId);

  const { data: secretSyncs = [], isPending: isSecretSyncsPending } = useListSecretSyncs(
    workspaceId,
    {
      refetchInterval: 2000
    }
  );

  const { mutateAsync: deleteIntegration } = useDeleteIntegration();
  const {
    mutateAsync: deleteIntegrationAuths,
    isSuccess: isDeleteIntegrationAuthSuccess,
    reset: resetDeleteIntegrationAuths
  } = useDeleteIntegrationAuths();

  const isIntegrationsAuthorizedEmpty = !Object.keys(integrationAuths || {}).length;
  const isIntegrationsEmpty = !integrations?.length;
  // summary: this use effect is trigger when all integration auths are removed thus deactivate bot
  // details: so on successfully deleting an integration auth, immediately integration list is refeteched
  // After the refetch is completed check if its empty. Then set bot active and reset the submit hook for isSuccess to go back to false
  useEffect(() => {
    if (
      isDeleteIntegrationAuthSuccess &&
      !isIntegrationFetching &&
      !isIntegrationAuthFetching &&
      isIntegrationsAuthorizedEmpty &&
      isIntegrationsEmpty
    ) {
      resetDeleteIntegrationAuths();
    }
  }, [
    isIntegrationFetching,
    isDeleteIntegrationAuthSuccess,
    isIntegrationAuthFetching,
    isIntegrationsAuthorizedEmpty,
    isIntegrationsEmpty
  ]);

  // useEffect(() => {
  //   setView(integrations?.length ? IntegrationView.List : IntegrationView.New);
  // }, [isIntegrationsFetched]);

  const handleProviderIntegration = async (provider: string) => {
    const selectedCloudIntegration = cloudIntegrations?.find(({ slug }) => provider === slug);
    if (!selectedCloudIntegration) return;

    try {
      redirectForProviderAuth(currentWorkspace.id, navigate, selectedCloudIntegration);
    } catch (error) {
      console.error(error);
    }
  };

  // function to strat integration for a provider
  // confirmation to user passing the bot key for provider to get secret access
  const handleProviderIntegrationStart = (provider: string) => {
    handleProviderIntegration(provider);
  };

  const handleIntegrationDelete = async (
    integrationId: string,
    shouldDeleteIntegrationSecrets: boolean,
    cb: () => void
  ) => {
    try {
      await deleteIntegration({ id: integrationId, workspaceId, shouldDeleteIntegrationSecrets });
      if (cb) cb();
      createNotification({
        type: "success",
        text: "Deleted integration"
      });
    } catch (err) {
      console.log(err);
      createNotification({
        type: "error",
        text: "Failed to delete integration"
      });
    }
  };

  const handleIntegrationAuthRevoke = async (provider: string, cb?: () => void) => {
    const integrationAuthForProvider = integrationAuths?.[provider];
    if (!integrationAuthForProvider) return;

    try {
      await deleteIntegrationAuths({
        integration: provider,
        workspaceId
      });
      if (cb) cb();
      createNotification({
        type: "success",
        text: "Revoked provider authentication"
      });
    } catch (err) {
      console.error(err);
      createNotification({
        type: "error",
        text: "Failed to revoke provider authentication"
      });
    }
  };

  if (isIntegrationLoading || isCloudIntegrationsLoading || isSecretSyncsPending)
    return (
      <div className="flex flex-col items-center gap-2">
        <ContentLoader text={["Loading integrations..."]} />
      </div>
    );

  const updateSelectedTab = (tab: string) => {
    navigate({
      to: ROUTE_PATHS.SecretManager.IntegrationsListPage.path,
      search: (prev) => ({ ...prev, selectedTab: tab }),
      params: {
        projectId: workspaceId
      }
    });
  };

  return (
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
            <Tab value={IntegrationsListPageTabs.FrameworkIntegrations}>Framework Integrations</Tab>
            <Tab value={IntegrationsListPageTabs.InfrastructureIntegrations}>
              Infrastructure Integrations
            </Tab>
          </TabList>
          <TabPanel value={IntegrationsListPageTabs.SecretSyncs}>
            <SecretSyncsTab secretSyncs={secretSyncs} />
          </TabPanel>
          <TabPanel value={IntegrationsListPageTabs.NativeIntegrations}>
            <NativeIntegrationsTab
              cloudIntegrations={cloudIntegrations}
              isLoading={isIntegrationLoading}
              integrations={integrations}
              environments={environments}
              onIntegrationDelete={handleIntegrationDelete}
              workspaceId={workspaceId}
              isAuthLoading={isIntegrationAuthLoading || isCloudIntegrationsLoading}
              integrationAuths={integrationAuths}
              onIntegrationStart={handleProviderIntegrationStart}
              onIntegrationRevoke={handleIntegrationAuthRevoke}
            />
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
  );
};

export const IntegrationsListPage = () => {
  const { t } = useTranslation();

  return (
    <>
      <Helmet>
        <title>{t("common.head-title", { title: t("integrations.title") })}</title>
        <meta property="og:image" content="/images/message.png" />
        <meta property="og:title" content="Manage your .env files in seconds" />
        <meta name="og:description" content={t("integrations.description") as string} />
      </Helmet>
      <ProjectPermissionCan
        renderGuardBanner
        passThrough={false}
        I={ProjectPermissionActions.Read}
        a={ProjectPermissionSub.Integrations}
      >
        <Page />
      </ProjectPermissionCan>
    </>
  );
};
