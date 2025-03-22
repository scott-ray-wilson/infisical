import { EditSecretRotationV2Modal } from "@app/components/secret-rotations-v2/EditSecretRotationV2Modal";
import { RotateSecretRotationModal } from "@app/components/secret-rotations-v2/RotateSecretRotationV2Modal";
import { usePopUp } from "@app/hooks";
import { TSecretRotationV2 } from "@app/hooks/api/secretRotationsV2";

import { SecretRotationItem } from "./SecretRotationItem";

type Props = {
  secretRotations?: TSecretRotationV2[];
};

export const SecretRotationListView = ({ secretRotations }: Props) => {
  const { popUp, handlePopUpOpen, handlePopUpClose, handlePopUpToggle } = usePopUp([
    "editSecretRotation",
    "rotateSecretRotation"
  ] as const);

  return (
    <>
      {secretRotations?.map((secretRotation) => (
        <SecretRotationItem
          key={secretRotation.id}
          secretRotation={secretRotation}
          onEdit={() => handlePopUpOpen("editSecretRotation", secretRotation)}
          onRotate={() => handlePopUpOpen("rotateSecretRotation", secretRotation)}
        />
      ))}
      <EditSecretRotationV2Modal
        isOpen={popUp.editSecretRotation.isOpen}
        secretRotation={popUp.editSecretRotation.data as TSecretRotationV2}
        onOpenChange={(isOpen) => handlePopUpToggle("editSecretRotation", isOpen)}
      />
      <RotateSecretRotationModal
        isOpen={popUp.rotateSecretRotation.isOpen}
        secretRotation={popUp.rotateSecretRotation.data as TSecretRotationV2}
        onOpenChange={(isOpen) => handlePopUpToggle("rotateSecretRotation", isOpen)}
      />
    </>
  );
};
