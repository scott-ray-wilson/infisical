import { useState } from "react";
import { faPlus } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

import { Button, Checkbox, DeleteActionModal } from "@app/components/v2";
import { usePopUp, useToggle } from "@app/hooks";
import { IntegrationAuth } from "@app/hooks/api/integrationAuth/types.ts";
import { TCloudIntegration, TIntegration } from "@app/hooks/api/integrations/types";
import { CloudIntegrationSection } from "@app/pages/secret-manager/IntegrationsListPage/components/CloudIntegrationSection";

import { IntegrationsTable } from "./IntegrationsTable";

type Props = {
  environments: Array<{ name: string; slug: string; id: string }>;
  integrations?: TIntegration[];
  cloudIntegrations?: TCloudIntegration[];
  isLoading?: boolean;
  onIntegrationDelete: (
    integrationId: string,
    shouldDeleteIntegrationSecrets: boolean,
    cb: () => void
  ) => Promise<void>;
  workspaceId: string;
  isAuthLoading?: boolean;
  integrationAuths?: Record<string, IntegrationAuth>;
  onIntegrationStart: (slug: string) => void;
  // cb: handle popUpClose child->parent communication pattern
  onIntegrationRevoke: (slug: string, cb: () => void) => void;
};

enum IntegrationView {
  List = "list",
  New = "new"
}

export const NativeIntegrationsTab = ({
  environments,
  integrations,
  workspaceId,
  onIntegrationDelete,
  isLoading,
  cloudIntegrations,
  onIntegrationRevoke,
  onIntegrationStart,
  integrationAuths,
  isAuthLoading
}: Props) => {
  const { popUp, handlePopUpOpen, handlePopUpClose, handlePopUpToggle } = usePopUp([
    "deleteConfirmation",
    "deleteSecretsConfirmation"
  ] as const);

  const [view, setView] = useState<IntegrationView>(IntegrationView.List);

  const [shouldDeleteSecrets, setShouldDeleteSecrets] = useToggle(false);

  return (
    <>
      {view === IntegrationView.List ? (
        <div className="w-full rounded-lg border border-mineshaft-600 bg-mineshaft-900 p-4">
          <div className="mb-4 flex items-center justify-between">
            <p className="text-xl font-semibold text-mineshaft-100">Native Integrations</p>
            <Button
              colorSchema="secondary"
              type="submit"
              leftIcon={<FontAwesomeIcon icon={faPlus} />}
              onClick={() => setView(IntegrationView.New)}
            >
              Add Integration
            </Button>
          </div>
          <IntegrationsTable
            cloudIntegrations={cloudIntegrations}
            integrations={integrations}
            isLoading={isLoading}
            workspaceId={workspaceId}
            environments={environments}
            onDeleteIntegration={(integration) => {
              setShouldDeleteSecrets.off();
              handlePopUpOpen("deleteConfirmation", integration);
            }}
          />
        </div>
      ) : (
        <CloudIntegrationSection
          onIntegrationStart={onIntegrationStart}
          onIntegrationRevoke={onIntegrationRevoke}
          integrationAuths={integrationAuths}
          cloudIntegrations={cloudIntegrations}
          isLoading={isAuthLoading}
          onViewActiveIntegrations={() => setView(IntegrationView.List)}
        />
      )}
      <DeleteActionModal
        isOpen={popUp.deleteConfirmation.isOpen}
        title={`Are you sure want to remove ${
          (popUp?.deleteConfirmation.data as TIntegration)?.integration || " "
        } integration for ${
          (popUp?.deleteConfirmation.data as TIntegration)?.app || "this project"
        }?`}
        onChange={(isOpen) => handlePopUpToggle("deleteConfirmation", isOpen)}
        deleteKey={
          ((popUp?.deleteConfirmation?.data as TIntegration)?.integration ===
            "azure-app-configuration" &&
            (popUp?.deleteConfirmation?.data as TIntegration)?.app
              ?.split("//")[1]
              ?.split(".")[0]) ||
          (popUp?.deleteConfirmation?.data as TIntegration)?.app ||
          (popUp?.deleteConfirmation?.data as TIntegration)?.owner ||
          (popUp?.deleteConfirmation?.data as TIntegration)?.path ||
          (popUp?.deleteConfirmation?.data as TIntegration)?.integration ||
          ""
        }
        onDeleteApproved={async () => {
          if (shouldDeleteSecrets) {
            handlePopUpOpen("deleteSecretsConfirmation");
            return;
          }

          await onIntegrationDelete(
            (popUp?.deleteConfirmation.data as TIntegration).id,
            false,
            () => handlePopUpClose("deleteConfirmation")
          );
        }}
      >
        {(popUp?.deleteConfirmation?.data as TIntegration)?.integration === "github" && (
          <div className="mt-4">
            <Checkbox
              id="delete-integration-secrets"
              checkIndicatorBg="text-white"
              onCheckedChange={() => setShouldDeleteSecrets.toggle()}
            >
              Delete previously synced secrets from the destination
            </Checkbox>
          </div>
        )}
      </DeleteActionModal>
      <DeleteActionModal
        isOpen={popUp.deleteSecretsConfirmation.isOpen}
        title={`Are you sure you also want to delete secrets on ${
          (popUp?.deleteConfirmation.data as TIntegration)?.integration
        }?`}
        subTitle="By confirming, you acknowledge that all secrets managed by this integration will be removed from the destination. This action is irreversible."
        onChange={(isOpen) => handlePopUpToggle("deleteSecretsConfirmation", isOpen)}
        deleteKey="confirm"
        onDeleteApproved={async () => {
          await onIntegrationDelete(
            (popUp?.deleteConfirmation.data as TIntegration).id,
            true,
            () => {
              handlePopUpClose("deleteSecretsConfirmation");
              handlePopUpClose("deleteConfirmation");
            }
          );
        }}
      />
    </>
  );
};
