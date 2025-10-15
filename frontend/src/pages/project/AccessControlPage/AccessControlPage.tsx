import { Helmet } from "react-helmet";
import { useTranslation } from "react-i18next";
import { faIdBadge, faKey, faServer, faUser, faUsers } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { useNavigate, useSearch } from "@tanstack/react-router";

import { PageHeader, Tab, TabList, TabPanel, Tabs } from "@app/components/v2";
import { useProject } from "@app/context";
import { getProjectBaseURL } from "@app/helpers/project";
import { ProjectType } from "@app/hooks/api/projects/types";
import { ProjectAccessControlTabs } from "@app/types/project";

import {
  GroupsTab,
  IdentityTab,
  MembersTab,
  ProjectRoleListTab,
  ServiceTokenTab
} from "./components";

const Page = () => {
  const navigate = useNavigate();
  const { currentProject } = useProject();
  const selectedTab = useSearch({
    strict: false,
    select: (el) => el.selectedTab
  });

  const updateSelectedTab = (tab: string) => {
    navigate({
      to: `${getProjectBaseURL(currentProject.type)}/access-management` as const,
      search: (prev) => ({ ...prev, selectedTab: tab }),
      params: {
        projectId: currentProject.id
      }
    });
  };

  const isSecretManager = currentProject.type === ProjectType.SecretManager;

  return (
    <div className="container mx-auto flex flex-col justify-between bg-bunker-800 text-white">
      <div className="mx-auto mb-6 w-full max-w-7xl">
        <PageHeader
          scope="project"
          title="Access Control"
          description="Manage fine-grained access for users, groups, roles, and identities within your project resources."
        />
        <Tabs
          orientation="vertical"
          className="mt-8"
          value={selectedTab}
          onValueChange={updateSelectedTab}
        >
          <TabList>
            <Tab variant="ghost" value={ProjectAccessControlTabs.Member}>
              <FontAwesomeIcon icon={faUser} size="xs" className="mr-2" />
              Users
            </Tab>
            <Tab variant="ghost" value={ProjectAccessControlTabs.Groups}>
              <FontAwesomeIcon icon={faUsers} size="xs" className="mr-2" />
              Groups
            </Tab>
            <Tab variant="ghost" value={ProjectAccessControlTabs.Identities}>
              <FontAwesomeIcon icon={faServer} size="xs" className="mr-2" />
              Machine Identities
            </Tab>
            {isSecretManager && (
              <Tab variant="ghost" value={ProjectAccessControlTabs.ServiceTokens}>
                <FontAwesomeIcon icon={faKey} size="xs" className="mr-2" />
                Service Tokens
              </Tab>
            )}
            <Tab variant="ghost" value={ProjectAccessControlTabs.Roles}>
              <FontAwesomeIcon icon={faIdBadge} size="xs" className="mr-2" />
              Project Roles
            </Tab>
          </TabList>
          <TabPanel className="py-0" value={ProjectAccessControlTabs.Member}>
            <MembersTab />
          </TabPanel>
          <TabPanel className="py-0" value={ProjectAccessControlTabs.Groups}>
            <GroupsTab />
          </TabPanel>
          <TabPanel className="py-0" value={ProjectAccessControlTabs.Identities}>
            <IdentityTab />
          </TabPanel>
          {isSecretManager && (
            <TabPanel className="py-0" value={ProjectAccessControlTabs.ServiceTokens}>
              <ServiceTokenTab />
            </TabPanel>
          )}
          <TabPanel className="py-0" value={ProjectAccessControlTabs.Roles}>
            <ProjectRoleListTab />
          </TabPanel>
        </Tabs>
      </div>
    </div>
  );
};

export const AccessControlPage = () => {
  const { t } = useTranslation();

  return (
    <>
      <Helmet>
        <title>{t("common.head-title", { title: t("settings.members.title") })}</title>
        <link rel="icon" href="/infisical.ico" />
      </Helmet>
      <Page />
    </>
  );
};
