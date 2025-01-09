import { useState } from "react";

import { createNotification } from "@app/components/notifications";
import { Button, Modal, ModalClose, ModalContent, Switch } from "@app/components/v2";
import { SECRET_SYNC_MAP } from "@app/helpers/secretSyncs";
import { TSecretSync, useTriggerSecretSyncImport } from "@app/hooks/api/secretSyncs";

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

  const [shouldOverwrite, setShouldOverwrite] = useState(false);

  const triggerSyncImport = useTriggerSecretSyncImport();

  const handleTriggerSyncImport = async () => {
    try {
      await triggerSyncImport.mutateAsync({
        syncId,
        destination,
        shouldOverwrite
      });

      createNotification({
        text: `Successfully triggered import for ${destinationName} Sync`,
        type: "success"
      });

      onComplete();
    } catch (err) {
      console.error(err);

      createNotification({
        text: `Failed to trigger import for ${destinationName} Sync`,
        type: "error"
      });
    }
  };

  return (
    <>
      <p className="mb-8 text-sm text-mineshaft-200">
        Are you sure you want to import secrets from this {destinationName} destination into
        Infiscal?
      </p>
      <Switch
        id="should-overwrite"
        onCheckedChange={setShouldOverwrite}
        isChecked={shouldOverwrite}
      >
        <p className="ml-1 w-full">Overwrite Conflicting Secrets</p>
      </Switch>
      <div className="mt-8 flex w-full items-center justify-between gap-2">
        <ModalClose asChild>
          <Button colorSchema="secondary" variant="plain">
            Cancel
          </Button>
        </ModalClose>
        <Button onClick={handleTriggerSyncImport} colorSchema="secondary">
          Import Secrets
        </Button>
      </div>
    </>
  );
};

export const SecretSyncImportModal = ({ isOpen, onOpenChange, secretSync }: Props) => {
  if (!secretSync) return null;

  const destinationName = SECRET_SYNC_MAP[secretSync.destination].name;

  return (
    <Modal isOpen={isOpen} onOpenChange={onOpenChange}>
      <ModalContent
        title="Import Secrets"
        subTitle={`Import secrets into Infisical from this ${destinationName} Sync destination.`}
      >
        <Content secretSync={secretSync} onComplete={() => onOpenChange(false)} />
      </ModalContent>
    </Modal>
  );
};
