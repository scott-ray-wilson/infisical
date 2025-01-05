import { Modal, ModalContent } from "@app/components/v2";
import { TSecretSync } from "@app/hooks/api/secretSyncs";

import { SecretSyncHeader } from "./SecretSyncHeader";

type Props = {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  secretSync?: TSecretSync;
  fields: SecretSyncEditFields;
};

type ContentProps = {
  onComplete: (secretSync: TSecretSync) => void;
  secretSync: TSecretSync;
  fields: SecretSyncEditFields;
};

export const EditSecretSyncModal = ({ secretSync, onOpenChange, fields, ...props }: Props) => {
  if (!secretSync) return null;

  return (
    <Modal {...props} onOpenChange={onOpenChange}>
      <ModalContent
        title={<SecretSyncHeader isConfigured destination={secretSync.destination} />}
        className="max-w-2xl"
        bodyClassName="overflow-visible"
      >
        <EditSecretSyncF
          onComplete={() => onOpenChange(false)}
          fields={fields}
          secretSync={secretSync}
        />
      </ModalContent>
    </Modal>
  );
};
