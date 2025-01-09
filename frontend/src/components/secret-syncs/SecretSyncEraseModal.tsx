import { createNotification } from "@app/components/notifications";
import { Button, Modal, ModalClose, ModalContent } from "@app/components/v2";
import { SECRET_SYNC_MAP } from "@app/helpers/secretSyncs";
import { TSecretSync, useTriggerSecretSyncErase } from "@app/hooks/api/secretSyncs";

type Props = {
  secretSync?: TSecretSync;
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
};

type ContentProps = {
  secretSync: TSecretSync;
  onComplete: () => void;
};

const Content = ({ secretSync, onComplete }: ContentProps) => {
  const { id: syncId, destination } = secretSync;
  const destinationName = SECRET_SYNC_MAP[destination].name;

  const triggerSyncImport = useTriggerSecretSyncErase();

  const handleTriggerSyncErase = async () => {
    try {
      await triggerSyncImport.mutateAsync({
        syncId,
        destination
      });

      createNotification({
        text: `Successfully triggered erase for ${destinationName} Sync`,
        type: "success"
      });

      onComplete();
    } catch (err) {
      console.error(err);

      createNotification({
        text: `Failed to trigger erase for ${destinationName} Sync`,
        type: "error"
      });
    }
  };

  return (
    <>
      <p className="mb-8 text-sm text-mineshaft-200">
        Are you sure you want to erase Infisical secrets from this {destinationName} destination?
      </p>
      <div className="mt-8 flex w-full items-center justify-between gap-2">
        <ModalClose asChild>
          <Button colorSchema="secondary" variant="plain">
            Cancel
          </Button>
        </ModalClose>
        <Button onClick={handleTriggerSyncErase} colorSchema="secondary">
          Erase Secrets
        </Button>
      </div>
    </>
  );
};

export const SecretSyncEraseModal = ({ isOpen, onOpenChange, secretSync }: Props) => {
  if (!secretSync) return null;

  const destinationName = SECRET_SYNC_MAP[secretSync.destination].name;

  return (
    <Modal isOpen={isOpen} onOpenChange={onOpenChange}>
      <ModalContent
        title="Erase Secrets"
        subTitle={`Erase synced secrets from this ${destinationName} Sync destination.`}
      >
        <Content secretSync={secretSync} onComplete={() => onOpenChange(false)} />
      </ModalContent>
    </Modal>
  );
};
