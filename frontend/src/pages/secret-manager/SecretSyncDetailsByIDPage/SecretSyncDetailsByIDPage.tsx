import { Helmet } from "react-helmet";
import { faBan, faChevronLeft } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { useNavigate, useParams } from "@tanstack/react-router";

import { ProjectPermissionCan } from "@app/components/permissions";
import { EditSecretSyncModal } from "@app/components/secret-syncs/EditSecretSyncModal";
import { SecretSyncEditFields } from "@app/components/secret-syncs/types";
import { Button, ContentLoader, EmptyState } from "@app/components/v2";
import { ROUTE_PATHS } from "@app/const/routes";
import { ProjectPermissionActions, ProjectPermissionSub } from "@app/context";
import { SECRET_SYNC_MAP } from "@app/helpers/secretSyncs";
import { usePopUp } from "@app/hooks";
import { useSyncIntegration } from "@app/hooks/api/integrations/queries";
import { useGetSecretSync } from "@app/hooks/api/secretSyncs";
import { SecretSync } from "@app/hooks/api/secretSyncs/enums";
import { SecretSyncAuditLogsSection } from "@app/pages/secret-manager/SecretSyncDetailsByIDPage/components/SecretSyncAuditLogsSection";
import { IntegrationsListPageTabs } from "@app/types/integrations";

import {
  SecretSyncDetailsSection,
  SecretSyncOptionsSection,
  SecretSyncSourceSection
} from "./components";

const PageContent = () => {
  const navigate = useNavigate();
  const { destination, syncId, projectId } = useParams({
    from: ROUTE_PATHS.SecretManager.SecretSyncDetailsByIDPage.id,
    select: (params) => ({
      ...params,
      destination: params.destination as SecretSync
    })
  });

  const { mutateAsync: syncIntegration } = useSyncIntegration();

  const { handlePopUpToggle, popUp, handlePopUpOpen } = usePopUp(["editSync"] as const);

  const { data: secretSync, isPending } = useGetSecretSync(destination, syncId, {
    refetchInterval: 4000
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
        <EmptyState
          className="max-w-2xl rounded-md text-center"
          icon={faBan}
          title={`Could not find ${SECRET_SYNC_MAP[destination].name ?? "Secret"} Sync with ID ${syncId}`}
        />
      </div>
    );
  }

  const destinationDetails = SECRET_SYNC_MAP[secretSync.destination];

  const handleEditDetails = () => handlePopUpOpen("editSync", SecretSyncEditFields.Details);

  const handleEditSource = () => handlePopUpOpen("editSync", SecretSyncEditFields.Source);

  const handleEditOptions = () => handlePopUpOpen("editSync", SecretSyncEditFields.Options);

  return (
    <>
      <div className="container mx-auto flex flex-col justify-between bg-bunker-800 font-inter text-white">
        <div className="mx-auto mb-6 w-full max-w-7xl px-6 py-6">
          <Button
            variant="link"
            type="submit"
            leftIcon={<FontAwesomeIcon icon={faChevronLeft} />}
            onClick={() => {
              navigate({
                to: ROUTE_PATHS.SecretManager.IntegrationsListPage.path,
                params: {
                  projectId
                },
                search: {
                  selectedTab: IntegrationsListPageTabs.SecretSyncs
                }
              });
            }}
            className="mb-4"
          >
            Secret Syncs
          </Button>
          <div className="mb-6 flex w-full items-center gap-3">
            <img
              alt={`${destinationDetails.name} sync`}
              src={`/images/integrations/${destinationDetails.image}`}
              className="ml-1 mt-3 w-11"
            />
            <div>
              <p className="text-3xl font-semibold text-white">{secretSync.name}</p>
              <p className="leading-3 text-bunker-300">{destinationDetails.name} Sync</p>
            </div>
          </div>
          <div className="flex justify-center">
            <div className="mr-4 flex w-72 flex-col gap-4">
              <SecretSyncDetailsSection secretSync={secretSync} onEditDetails={handleEditDetails} />
              <SecretSyncSourceSection secretSync={secretSync} onEditSource={handleEditSource} />
              <SecretSyncOptionsSection secretSync={secretSync} onEditOptions={handleEditOptions} />
            </div>
            <div className="flex-1">
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

  // return (
  //     <>
  //       <Helmet>
  //         <title>Integration Details | Infisical</title>
  //         <meta property="og:image" content="/images/message.png"/>
  //         <meta property="og:title" content="Manage your .env files in seconds"/>
  //         <meta name="og:description" content={t("integrations.description") as string}/>
  //       </Helmet>
  //       <div className="container mx-auto flex flex-col justify-between bg-bunker-800 text-white">
  //         {integration ? (
  //             <div className="mx-auto mb-6 w-full max-w-7xl px-6 py-6">
  //               <Button
  //                   variant="link"
  //                   type="submit"
  //                   leftIcon={<FontAwesomeIcon icon={faChevronLeft}/>}
  //                   onClick={() => {
  //                     navigate({
  //                       to: "/secret-manager/$projectId/integrations",
  //                       params: {
  //                         projectId
  //                       }
  //                     });
  //                   }}
  //                   className="mb-4"
  //               >
  //                 Integrations
  //               </Button>
  //               <div className="mb-4 flex items-center justify-between">
  //                 <p className="text-3xl font-semibold text-white">
  //               {integrationSlugNameMapping[integration.integration]} Integration
  //             </p>
  //             <DropdownMenu>
  //               <DropdownMenuTrigger asChild className="rounded-lg">
  //                 <div className="hover:text-primary-400 data-[state=open]:text-primary-400">
  //                   <Tooltip content="More options">
  //                     <FontAwesomeIcon size="sm" icon={faEllipsis} />
  //                   </Tooltip>
  //                 </div>
  //               </DropdownMenuTrigger>
  //               <DropdownMenuContent align="start" className="p-1">
  //                 <DropdownMenuItem
  //                   onClick={async () => {
  //                     await syncIntegration({
  //                       id: integration.id,
  //                       lastUsed: integration.lastUsed!,
  //                       workspaceId: projectId!
  //                     });
  //                   }}
  //                 >
  //                   <div className="flex items-center gap-2">
  //                     <FontAwesomeIcon icon={faRefresh} />
  //                     Manually Sync
  //                   </div>
  //                 </DropdownMenuItem>
  //                 <OrgPermissionCan
  //                   I={OrgPermissionActions.Delete}
  //                   a={OrgPermissionSubjects.Member}
  //                 >
  //                   {(isAllowed) => (
  //                     <DropdownMenuItem
  //                       className={twMerge(
  //                         isAllowed
  //                           ? "hover:!bg-red-500 hover:!text-white"
  //                           : "pointer-events-none cursor-not-allowed opacity-50"
  //                       )}
  //                       onClick={() => {}}
  //                       disabled={!isAllowed}
  //                     >
  //                       <div className="flex items-center gap-2">
  //                         <FontAwesomeIcon icon={faTrash} />
  //                         Delete Integration
  //                       </div>
  //                     </DropdownMenuItem>
  //                   )}
  //                 </OrgPermissionCan>
  //               </DropdownMenuContent>
  //             </DropdownMenu>
  //           </div>
  //           <div className="flex justify-center">
  //             <div className="mr-4 w-96">
  //               <IntegrationDetailsSection integration={integration} />
  //               <IntegrationConnectionSection integration={integration} />
  //             </div>
  //             <div className="space-y-4">
  //               <IntegrationSettingsSection integration={integration} />
  //               <IntegrationAuditLogsSection integration={integration} />
  //             </div>
  //           </div>
  //         </div>
  //       ) : (
  //         <div>
  //           <EmptyState title="Error: Unable to fetch integration." className="py-12" />
  //         </div>
  //       )}
  //     </div>
  //   </>
  // );
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
        I={ProjectPermissionActions.Read}
        a={ProjectPermissionSub.SecretSyncs}
      >
        <PageContent />
      </ProjectPermissionCan>
    </>
  );
};
