import { faPlus } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

import { createNotification } from "@app/components/notifications";
import { Button, DeleteActionModal, Tab, TabList, TabPanel, Tabs } from "@app/components/v2";
import { useOrganization } from "@app/context";
import { usePopUp } from "@app/hooks";
import { useGetUserConsumerKey } from "@app/hooks/api/consumer-keys";
import { useDeleteConsumerSecret, useGetConsumerSecrets } from "@app/hooks/api/consumer-secrets";
import { ConsumerSecretType } from "@app/hooks/api/consumer-secrets/types";
import {
  ConsumerSecretForm,
  CreditCardsTable,
  LoginCredentialsTable,
  SecureNotesTable
} from "@app/views/UserSecretsPage/components";

type ModalData = { name: string; id: string };

export const UserSecretsPage = () => {
  const { handlePopUpOpen, handlePopUpToggle, handlePopUpClose, popUp } = usePopUp([
    "addConsumerSecret",
    "deleteConsumerSecretConfirmation",
    "updateConsumerSecret"
  ] as const);

  const { currentOrg } = useOrganization();

  const { data: latestConsumerKey } = useGetUserConsumerKey(currentOrg?.id!);

  const { mutateAsync: deleteConsumerSecret } = useDeleteConsumerSecret();

  const { data: consumerSecrets, isLoading } = useGetConsumerSecrets({
    orgId: currentOrg?.id!,
    decryptConsumerKey: latestConsumerKey!
  });

  const onDeleteConsumerSecret = async (consumerSecretId: string) => {
    try {
      await deleteConsumerSecret({
        orgId: currentOrg?.id!,
        consumerSecretId
      });

      createNotification({
        text: "Successfully deleted personal secret",
        type: "success"
      });
    } catch (err) {
      console.error(err);
      createNotification({
        text: "Failed to delete personal secret",
        type: "error"
      });
    }

    handlePopUpClose("deleteConsumerSecretConfirmation");
  };

  return (
    <div className="container mx-auto h-full w-full max-w-7xl bg-bunker-800 px-6 text-white">
      <div className="flex items-center justify-between py-6">
        <div className="flex w-full flex-col">
          <h2 className="text-3xl font-semibold text-gray-200">User Secrets</h2>
          <p className="text-bunker-300">Store personal secrets securely</p>
        </div>
      </div>
      <div className="flex items-center justify-end">
        <Button
          variant="outline_bg"
          leftIcon={<FontAwesomeIcon icon={faPlus} />}
          onClick={() => handlePopUpOpen("addConsumerSecret")}
          className="ml-auto h-10"
        >
          Add Personal Secret
        </Button>
      </div>
      <Tabs defaultValue={ConsumerSecretType.Login}>
        <TabList>
          <Tab value={ConsumerSecretType.Login}>Login Credentials</Tab>
          <Tab value={ConsumerSecretType.CreditCard}>
            <div className="flex items-center">
              <p>Credit Cards</p>
            </div>
          </Tab>
          <Tab value={ConsumerSecretType.Note}>Secure Notes</Tab>
        </TabList>
        <TabPanel value={ConsumerSecretType.Login}>
          <LoginCredentialsTable
            handlePopUpOpen={handlePopUpOpen}
            credentials={consumerSecrets?.filter(
              (secret) => secret.type === ConsumerSecretType.Login
            )}
            isLoading={isLoading}
          />
        </TabPanel>
        <TabPanel value={ConsumerSecretType.CreditCard}>
          <CreditCardsTable
            handlePopUpOpen={handlePopUpOpen}
            cards={consumerSecrets?.filter(
              (secret) => secret.type === ConsumerSecretType.CreditCard
            )}
            isLoading={isLoading}
          />
        </TabPanel>
        <TabPanel value={ConsumerSecretType.Note}>
          <SecureNotesTable
            handlePopUpOpen={handlePopUpOpen}
            notes={consumerSecrets?.filter((secret) => secret.type === ConsumerSecretType.Note)}
            isLoading={isLoading}
          />
        </TabPanel>
      </Tabs>

      <ConsumerSecretForm
        orgId={currentOrg?.id!}
        isOpen={popUp.addConsumerSecret.isOpen || popUp.updateConsumerSecret.isOpen}
        consumerSecret={
          popUp.updateConsumerSecret.isOpen
            ? consumerSecrets?.find(
                (secret) => secret.id === (popUp?.updateConsumerSecret?.data as ModalData)?.id
              )
            : undefined
        }
        onTogglePopUp={(isOpen) =>
          handlePopUpToggle(
            popUp.addConsumerSecret.isOpen ? "addConsumerSecret" : "updateConsumerSecret",
            isOpen
          )
        }
        onClose={() =>
          handlePopUpClose(
            popUp.addConsumerSecret.isOpen ? "addConsumerSecret" : "updateConsumerSecret"
          )
        }
        decryptConsumerKey={latestConsumerKey!}
      />
      <DeleteActionModal
        isOpen={popUp.deleteConsumerSecretConfirmation.isOpen}
        title={`Delete ${
          (popUp?.deleteConsumerSecretConfirmation?.data as ModalData)?.name || " "
        } personal secret?`}
        onChange={(isOpen) => handlePopUpToggle("deleteConsumerSecretConfirmation", isOpen)}
        deleteKey={(popUp?.deleteConsumerSecretConfirmation?.data as ModalData)?.name}
        onClose={() => handlePopUpClose("deleteConsumerSecretConfirmation")}
        onDeleteApproved={() =>
          onDeleteConsumerSecret((popUp?.deleteConsumerSecretConfirmation?.data as ModalData)?.id)
        }
      />
    </div>
  );
};
