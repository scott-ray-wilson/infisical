import { useRouter } from "next/router";
import { faBan, faChevronLeft } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

import { Button, ContentLoader, EmptyState } from "@app/components/v2";
import { useWorkspace } from "@app/context";
import { SECRET_SYNC_MAP } from "@app/helpers/secretSyncs";
import { usePopUp } from "@app/hooks";
import { useGetSecretSync } from "@app/hooks/api/secretSyncs";
import { SecretSync } from "@app/hooks/api/secretSyncs/enums";

import { SecretSyncDetailsSection } from "./components";

export const SecretSyncOverview = () => {
  const router = useRouter();
  const syncId = router.query.syncId as string;
  const destination = router.query.destination as SecretSync;
  const { currentWorkspace } = useWorkspace();

  const { handlePopUpToggle, popUp, handlePopUpOpen } = usePopUp(["editSync"] as const);

  const { data: secretSync, isLoading } = useGetSecretSync(destination, syncId, {
    refetchInterval: 4000
  });

  if (isLoading) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <ContentLoader />
      </div>
    );
  }

  if (!secretSync) {
    const destinationName = SECRET_SYNC_MAP[destination].name ?? "Secret";

    return (
      <div className="flex h-full w-full items-center justify-center px-20">
        <EmptyState
          className="max-w-2xl rounded-md text-center"
          icon={faBan}
          title={`Could not find ${destinationName} Sync with ID ${syncId}`}
        />
      </div>
    );
  }

  const destinationDetails = SECRET_SYNC_MAP[secretSync.destination];

  const handleEditDetails = () => handlePopUpOpen("editSync", SecretSyncEdit.Details);

  return (
    <div className="container mx-auto flex flex-col justify-between bg-bunker-800 text-white">
      <div className="mx-auto mb-6 w-full max-w-7xl py-6 px-6">
        <Button
          variant="link"
          type="submit"
          leftIcon={<FontAwesomeIcon icon={faChevronLeft} />}
          onClick={() => {
            router.push(`/integrations/${currentWorkspace?.id}?selectedTab=secret-sync`);
          }}
          className="mb-4"
        >
          Secret Syncs
        </Button>
        <div className="mb-4 flex items-center gap-2">
          <img
            alt={`${destinationDetails.name} sync`}
            src={`/images/integrations/${destinationDetails.image}`}
            className="w-10 rounded-md border border-mineshaft-500 bg-mineshaft-800 p-1.5"
          />
          <p className="text-3xl font-semibold text-white">{destinationDetails.name} Sync</p>
        </div>
        <div className="grid w-full grid-cols-4 gap-3">
          <SecretSyncDetailsSection secretSync={secretSync} onEditDetails={handleEditDetails} />
        </div>
      </div>
    </div>
  );
};
