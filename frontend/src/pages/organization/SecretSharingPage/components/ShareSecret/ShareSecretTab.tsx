import { ForwardIcon } from "lucide-react";

import { createNotification } from "@app/components/notifications";
import { DeleteActionModal } from "@app/components/v2";
import {
  Button,
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  DocumentationLinkBadge
} from "@app/components/v3";
import { useDeleteSharedSecret } from "@app/hooks/api";
import { usePopUp } from "@app/hooks/usePopUp";

import { AddShareSecretModal } from "./AddShareSecretModal";
import { ShareSecretsTable } from "./ShareSecretsTable";

type DeleteModalData = { name: string; id: string };

export const ShareSecretTab = () => {
  const { popUp, handlePopUpToggle, handlePopUpClose, handlePopUpOpen } = usePopUp([
    "createSharedSecret",
    "deleteSharedSecretConfirmation"
  ] as const);

  const deleteSecretShare = useDeleteSharedSecret();

  const onDeleteApproved = async () => {
    deleteSecretShare.mutateAsync({
      sharedSecretId: (popUp?.deleteSharedSecretConfirmation?.data as DeleteModalData)?.id
    });
    createNotification({
      text: "Successfully deleted shared secret",
      type: "success"
    });

    handlePopUpClose("deleteSharedSecretConfirmation");
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          Shared Secrets
          <DocumentationLinkBadge href="https://infisical.com/docs/documentation/platform/secret-sharing" />
        </CardTitle>
        <CardDescription>Manage and view your shared secrets</CardDescription>
        <CardAction>
          <Button
            variant="org"
            onClick={() => {
              handlePopUpOpen("createSharedSecret");
            }}
          >
            <ForwardIcon />
            Share Secret
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent>
        <ShareSecretsTable handlePopUpOpen={handlePopUpOpen} />
      </CardContent>
      <AddShareSecretModal popUp={popUp} handlePopUpToggle={handlePopUpToggle} />
      <DeleteActionModal
        isOpen={popUp.deleteSharedSecretConfirmation.isOpen}
        title={`Delete ${
          (popUp?.deleteSharedSecretConfirmation?.data as DeleteModalData)?.name || " "
        } shared secret?`}
        onChange={(isOpen) => handlePopUpToggle("deleteSharedSecretConfirmation", isOpen)}
        deleteKey={(popUp?.deleteSharedSecretConfirmation?.data as DeleteModalData)?.name}
        onClose={() => handlePopUpClose("deleteSharedSecretConfirmation")}
        onDeleteApproved={onDeleteApproved}
      />
    </Card>
  );
};
