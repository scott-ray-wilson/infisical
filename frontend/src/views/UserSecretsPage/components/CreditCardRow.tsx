import { faEdit, faTrashCan } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

import { IconButton, Td, Tr } from "@app/components/v2";
import { DecryptedConsumerSecret } from "@app/hooks/api/consumer-secrets/types";
import { UsePopUpState } from "@app/hooks/usePopUp";
import { CopyFieldButton } from "@app/views/UserSecretsPage/components/CopyFieldButton";
import { ObscuredField } from "@app/views/UserSecretsPage/components/ObscuredField";

type Props = {
  card: DecryptedConsumerSecret;
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

export const CreditCardRow = ({ card, handlePopUpOpen }: Props) => {
  const { id, secretName, secretFieldOne, secretFieldTwo, secretFieldThree } = card;
  return (
    <Tr className="h-10" key={`credit-card-${id}`}>
      <Td>{secretName}</Td>
      <Td className="w-1/3">
        <div className="flex items-baseline gap-2">
          <ObscuredField field={secretFieldOne} />
          <CopyFieldButton field={secretFieldOne} />
        </div>
      </Td>
      <Td>
        <div className="flex items-baseline gap-2">
          <ObscuredField field={secretFieldTwo} />
          <CopyFieldButton field={secretFieldTwo} />
        </div>
      </Td>
      <Td>
        <div className="flex items-baseline gap-2">
          {secretFieldThree}
          <CopyFieldButton field={secretFieldTwo} />
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
