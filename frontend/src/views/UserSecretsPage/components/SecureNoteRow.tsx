import { faEdit, faTrashCan } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

import { IconButton, Td, Tr } from "@app/components/v2";
import { DecryptedConsumerSecret } from "@app/hooks/api/consumer-secrets/types";
import { UsePopUpState } from "@app/hooks/usePopUp";
import { CopyFieldButton } from "@app/views/UserSecretsPage/components/CopyFieldButton";
import { ObscuredField } from "@app/views/UserSecretsPage/components/ObscuredField";

type Props = {
  note: DecryptedConsumerSecret;
  handlePopUpOpen: (
    popUpName: keyof UsePopUpState<["deleteConsumerSecretConfirmation", "updateConsumerSecret"]>,
    {
      name,
      id
    }: {
      name: string;
      id: string;
    }
  ) => void;
};

export const SecureNoteRow = ({ note, handlePopUpOpen }: Props) => {
  const { id, secretName, secretFieldOne } = note;
  return (
    <Tr className="h-10 align-text-top" key={`secure-note-${id}`}>
      <Td>
        <div className="w-40">
          <p className="truncate">{secretName}</p>
        </div>
      </Td>
      <Td>
        <div className=" flex w-full max-w-[55vw] items-baseline gap-2">
          <ObscuredField field={secretFieldOne} />
          <CopyFieldButton field={secretFieldOne} />
        </div>
      </Td>
      <Td>
        <div className="flex items-center gap-2">
          <IconButton
            onClick={() =>
              handlePopUpOpen("updateConsumerSecret", {
                name: secretName,
                id
              })
            }
            colorSchema="secondary"
            ariaLabel="update"
          >
            <FontAwesomeIcon icon={faEdit} />
          </IconButton>
          <IconButton
            onClick={() =>
              handlePopUpOpen("deleteConsumerSecretConfirmation", {
                name: secretName,
                id
              })
            }
            colorSchema="danger"
            ariaLabel="delete"
          >
            <FontAwesomeIcon icon={faTrashCan} />
          </IconButton>
        </div>
      </Td>
    </Tr>
  );
};
