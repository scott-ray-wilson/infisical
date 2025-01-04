import { Fragment, useEffect, useState } from "react";
import { useRouter } from "next/router";
import { Tab } from "@headlessui/react";

import { Badge } from "@app/components/v2";
import { TSecretSync } from "@app/hooks/api/secretSyncs";
import { TCloudIntegration, TIntegration } from "@app/hooks/api/types";
import { SecretSyncsTab } from "@app/views/IntegrationsPage/components/IntegrationsSection/components/SecretSyncsTab/SecretSyncsTab";

import { NativeIntegrationsTab } from "./components/NativeIntegrationsTab";

type Props = {
  environments: Array<{ name: string; slug: string; id: string }>;
  integrations?: TIntegration[];
  secretSyncs?: TSecretSync[];
  cloudIntegrations?: TCloudIntegration[];
  isLoading?: boolean;
  onIntegrationDelete: (
    integrationId: string,
    shouldDeleteIntegrationSecrets: boolean,
    cb: () => void
  ) => Promise<void>;
  workspaceId: string;
  onAddIntegration: () => void;
};

const INTEGRATION_TABS = [
  { name: "Secret Syncs", key: "secret-syncs" },
  { name: "Native Integrations", key: "native-integrations" },
  { name: "Framework Integrations", key: "framework-integrations" },
  { name: "Infrastructure Integrations", key: "infrastructure-integrations" }
];

export const IntegrationsSection = ({
  integrations = [],
  secretSyncs = [],
  environments = [],
  isLoading,
  onIntegrationDelete,
  workspaceId,
  onAddIntegration,
  cloudIntegrations = []
}: Props) => {
  const { query } = useRouter();
  const [selectedTabIndex, setSelectedTabIndex] = useState(
    secretSyncs?.length
      ? INTEGRATION_TABS.findIndex((tab) => tab.key === "secret-syncs")
      : INTEGRATION_TABS.findIndex((tab) => tab.key === "native-integrations")
  );
  const selectedTab = query.selectedTab as string;

  useEffect(() => {
    if (selectedTab) {
      const index = INTEGRATION_TABS.findIndex((tab) => tab.key === selectedTab);
      if (index !== -1) {
        setSelectedTabIndex(index);
      }
    }
  }, [selectedTab]);

  return (
    <div className="mx-6 mb-8">
      <div className="mb-4 mt-6 flex flex-col items-start justify-between px-2 text-xl">
        <h1 className="text-3xl font-semibold">Integrations</h1>
        <p className="text-base text-bunker-300">Manage integrations with third-party services.</p>
      </div>
      <Tab.Group selectedIndex={selectedTabIndex} onChange={setSelectedTabIndex}>
        <Tab.List className="mb-6 w-full border-b-2 border-mineshaft-800">
          {INTEGRATION_TABS.map((tab) => (
            <Tab as={Fragment} key={tab.key}>
              {({ selected }) => (
                <button
                  type="button"
                  className={`w-30 mx-2 mr-4 py-2 text-sm font-medium outline-none ${
                    selected ? "border-b border-white text-white" : "text-mineshaft-400"
                  }`}
                >
                  {tab.name}
                  {tab.key === "secret-syncs" && (
                    <Badge variant="primary" className="ml-1 cursor-pointer text-xs">
                      New
                    </Badge>
                  )}
                </button>
              )}
            </Tab>
          ))}
        </Tab.List>
        <Tab.Panels>
          <Tab.Panel>
            <SecretSyncsTab secretSyncs={secretSyncs} />
          </Tab.Panel>
          <Tab.Panel>
            <NativeIntegrationsTab
              integrations={integrations}
              isLoading={isLoading}
              onAddIntegration={onAddIntegration}
              onIntegrationDelete={onIntegrationDelete}
              cloudIntegrations={cloudIntegrations}
              environments={environments}
              workspaceId={workspaceId}
            />
          </Tab.Panel>
          <Tab.Panel>
            <div />
          </Tab.Panel>
          <Tab.Panel>
            <div />
          </Tab.Panel>
        </Tab.Panels>
      </Tab.Group>
    </div>
  );
};
