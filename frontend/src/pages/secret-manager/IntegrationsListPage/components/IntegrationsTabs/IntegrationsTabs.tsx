import { Fragment, useState } from "react";
import { Tab } from "@headlessui/react";

import { Badge } from "@app/components/v2";
import { TSecretSync } from "@app/hooks/api/secretSyncs";
import { TCloudIntegration, TIntegration } from "@app/hooks/api/types";

import { NativeIntegrationsTab, SecretSyncsTab } from "./components";

type Props = {
  environments: Array<{ name: string; slug: string; id: string }>;
  integrations?: TIntegration[];
  cloudIntegrations?: TCloudIntegration[];
  secretSyncs?: TSecretSync[];
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

export const IntegrationsTabs = ({
  secretSyncs = [],
  integrations = [],
  environments = [],
  isLoading,
  onIntegrationDelete,
  workspaceId,
  onAddIntegration,
  cloudIntegrations = []
}: Props) => {
  const [selectedTabIndex, setSelectedTabIndex] = useState(0);

  // const { popUp, handlePopUpOpen, handlePopUpClose, handlePopUpToggle } = usePopUp([
  //   "deleteConfirmation",
  //   "deleteSecretsConfirmation"
  // ] as const);
  //
  // const [shouldDeleteSecrets, setShouldDeleteSecrets] = useToggle(false);

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

  // return (
  //   <div className="mx-6 mb-8">
  //     <div className="mb-4 mt-6 flex flex-col items-start justify-between px-2 text-xl">
  //       <h1 className="text-3xl font-semibold">Integrations</h1>
  //       <p className="text-base text-bunker-300">Manage integrations with third-party services.</p>
  //     </div>
  //     <div className="w-full rounded-lg border border-mineshaft-600 bg-mineshaft-900 p-4">
  //       <div className="mb-4 flex items-center justify-between">
  //         <p className="text-xl font-semibold text-mineshaft-100">Active Integrations</p>
  //         <Button
  //           colorSchema="primary"
  //           type="submit"
  //           leftIcon={<FontAwesomeIcon icon={faPlus} />}
  //           onClick={onAddIntegration}
  //         >
  //           Add Integration
  //         </Button>
  //       </div>
  //       <IntegrationsTable
  //         cloudIntegrations={cloudIntegrations}
  //         integrations={integrations}
  //         isLoading={isLoading}
  //         workspaceId={workspaceId}
  //         environments={environments}
  //         onDeleteIntegration={(integration) => {
  //           setShouldDeleteSecrets.off();
  //           handlePopUpOpen("deleteConfirmation", integration);
  //         }}
  //       />
  //     </div>
  //     <DeleteActionModal
  //       isOpen={popUp.deleteConfirmation.isOpen}
  //       title={`Are you sure want to remove ${
  //         (popUp?.deleteConfirmation.data as TIntegration)?.integration || " "
  //       } integration for ${
  //         (popUp?.deleteConfirmation.data as TIntegration)?.app || "this project"
  //       }?`}
  //       onChange={(isOpen) => handlePopUpToggle("deleteConfirmation", isOpen)}
  //       deleteKey={
  //         ((popUp?.deleteConfirmation?.data as TIntegration)?.integration ===
  //           "azure-app-configuration" &&
  //           (popUp?.deleteConfirmation?.data as TIntegration)?.app
  //             ?.split("//")[1]
  //             ?.split(".")[0]) ||
  //         (popUp?.deleteConfirmation?.data as TIntegration)?.app ||
  //         (popUp?.deleteConfirmation?.data as TIntegration)?.owner ||
  //         (popUp?.deleteConfirmation?.data as TIntegration)?.path ||
  //         (popUp?.deleteConfirmation?.data as TIntegration)?.integration ||
  //         ""
  //       }
  //       onDeleteApproved={async () => {
  //         if (shouldDeleteSecrets) {
  //           handlePopUpOpen("deleteSecretsConfirmation");
  //           return;
  //         }
  //
  //         await onIntegrationDelete(
  //           (popUp?.deleteConfirmation.data as TIntegration).id,
  //           false,
  //           () => handlePopUpClose("deleteConfirmation")
  //         );
  //       }}
  //     >
  //       {(popUp?.deleteConfirmation?.data as TIntegration)?.integration === "github" && (
  //         <div className="mt-4">
  //           <Checkbox
  //             id="delete-integration-secrets"
  //             checkIndicatorBg="text-white"
  //             onCheckedChange={() => setShouldDeleteSecrets.toggle()}
  //           >
  //             Delete previously synced secrets from the destination
  //           </Checkbox>
  //         </div>
  //       )}
  //     </DeleteActionModal>
  //     <DeleteActionModal
  //       isOpen={popUp.deleteSecretsConfirmation.isOpen}
  //       title={`Are you sure you also want to delete secrets on ${
  //         (popUp?.deleteConfirmation.data as TIntegration)?.integration
  //       }?`}
  //       subTitle="By confirming, you acknowledge that all secrets managed by this integration will be removed from the destination. This action is irreversible."
  //       onChange={(isOpen) => handlePopUpToggle("deleteSecretsConfirmation", isOpen)}
  //       deleteKey="confirm"
  //       onDeleteApproved={async () => {
  //         await onIntegrationDelete(
  //           (popUp?.deleteConfirmation.data as TIntegration).id,
  //           true,
  //           () => {
  //             handlePopUpClose("deleteSecretsConfirmation");
  //             handlePopUpClose("deleteConfirmation");
  //           }
  //         );
  //       }}
  //     />
  //   </div>
  // );
};
