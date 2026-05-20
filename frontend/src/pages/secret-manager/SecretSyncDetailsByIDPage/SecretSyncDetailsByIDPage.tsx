import { Helmet } from "react-helmet";
import { faChevronLeft } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { Link, useParams } from "@tanstack/react-router";
import { BanIcon } from "lucide-react";

import { ProjectPermissionCan } from "@app/components/permissions";
import { EditSecretSyncModal } from "@app/components/secret-syncs";
import { SecretSyncEditFields } from "@app/components/secret-syncs/types";
import { ContentLoader } from "@app/components/v2";
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle } from "@app/components/v3";
import { ROUTE_PATHS } from "@app/const/routes";
import { ProjectPermissionSub } from "@app/context";
import { ProjectPermissionSecretSyncActions } from "@app/context/ProjectPermissionContext/types";
import { SECRET_SYNC_MAP } from "@app/helpers/secretSyncs";
import { usePopUp } from "@app/hooks";
import { SecretSync, useGetSecretSync } from "@app/hooks/api/secretSyncs";
import { IntegrationsListPageTabs } from "@app/types/integrations";

import {
  SecretSyncActionTriggers,
  SecretSyncAuditLogsSection,
  SecretSyncDestinationSection,
  SecretSyncDetailsSection,
  SecretSyncOptionsSection,
  SecretSyncSourceSection
} from "./components";

const PageContent = () => {
  const { destination, syncId, projectId, orgId } = useParams({
    from: ROUTE_PATHS.SecretManager.SecretSyncDetailsByIDPage.id,
    select: (params) => ({
      ...params,
      destination: params.destination as SecretSync
    })
  });

  const { handlePopUpToggle, popUp, handlePopUpOpen } = usePopUp(["editSync"] as const);

  const { data: secretSync, isPending } = useGetSecretSync(destination, syncId, {
    refetchInterval: 30000
  });

  if (isPending) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <ContentLoader />
      </div>
    );
  }

  if (!secretSync) {
    return (
      <div className="flex h-full w-full items-center justify-center px-20">
        <Empty className="max-w-2xl">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <BanIcon />
            </EmptyMedia>
            <EmptyTitle>
              Could not find {SECRET_SYNC_MAP[destination].name ?? "Secret"} Sync with ID {syncId}
            </EmptyTitle>
          </EmptyHeader>
        </Empty>
      </div>
    );
  }

  const destinationDetails = SECRET_SYNC_MAP[secretSync.destination];

  const handleEditDetails = () => handlePopUpOpen("editSync", SecretSyncEditFields.Details);

  const handleEditSource = () => handlePopUpOpen("editSync", SecretSyncEditFields.Source);

  const handleEditOptions = () => handlePopUpOpen("editSync", SecretSyncEditFields.Options);

  const handleEditDestination = () => handlePopUpOpen("editSync", SecretSyncEditFields.Destination);

  return (
    <>
      <div className="container mx-auto flex flex-col justify-between bg-bunker-800 font-inter text-white">
        <div className="mx-auto mb-6 w-full max-w-8xl">
          <Link
            to={ROUTE_PATHS.SecretManager.IntegrationsListPage.path}
            params={{ orgId, projectId }}
            search={{ selectedTab: IntegrationsListPageTabs.SecretSyncs }}
            className="mb-4 flex w-fit items-center gap-x-1 text-sm text-mineshaft-400 transition duration-100 hover:text-mineshaft-400/80"
          >
            <FontAwesomeIcon icon={faChevronLeft} />
            Secret Syncs
          </Link>
          <div className="mb-6 flex w-full items-center gap-3">
            <img
              alt={`${destinationDetails.name} sync`}
              src={`/images/integrations/${destinationDetails.image}`}
              className="mt-3 ml-1 w-16"
            />
            <div className="min-w-0">
              <p className="truncate text-3xl font-medium text-white">{secretSync.name}</p>
              <p className="leading-3 text-bunker-300">{destinationDetails.name} Sync</p>
            </div>
            <SecretSyncActionTriggers secretSync={secretSync} />
          </div>
          <div className="flex justify-center">
            <div className="mr-4 flex w-72 flex-col gap-4">
              <SecretSyncDetailsSection secretSync={secretSync} onEditDetails={handleEditDetails} />
              <SecretSyncSourceSection secretSync={secretSync} onEditSource={handleEditSource} />
              <SecretSyncOptionsSection secretSync={secretSync} onEditOptions={handleEditOptions} />
            </div>
            <div className="flex flex-1 flex-col gap-4">
              <SecretSyncDestinationSection
                secretSync={secretSync}
                onEditDestination={handleEditDestination}
              />
              <SecretSyncAuditLogsSection secretSync={secretSync} />
            </div>
          </div>
        </div>
      </div>
      <EditSecretSyncModal
        isOpen={popUp.editSync.isOpen}
        onOpenChange={(isOpen) => handlePopUpToggle("editSync", isOpen)}
        fields={popUp.editSync.data}
        secretSync={secretSync}
      />
    </>
  );
};

export const SecretSyncDetailsByIDPage = () => {
  return (
    <>
      <Helmet>
        <title>Secret Sync | Infisical</title>
        <link rel="icon" href="/infisical.ico" />
      </Helmet>
      <ProjectPermissionCan
        renderGuardBanner
        passThrough={false}
        I={ProjectPermissionSecretSyncActions.Read}
        a={ProjectPermissionSub.SecretSyncs}
      >
        <PageContent />
      </ProjectPermissionCan>
    </>
  );
};
