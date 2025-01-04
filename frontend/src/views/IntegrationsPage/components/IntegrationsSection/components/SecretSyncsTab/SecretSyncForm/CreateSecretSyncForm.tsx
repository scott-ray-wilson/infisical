import { useState } from "react";
import { FormProvider, useForm } from "react-hook-form";
import { Tab } from "@headlessui/react";
import { zodResolver } from "@hookform/resolvers/zod";

import { createNotification } from "@app/components/notifications";
import { Button } from "@app/components/v2";
import { SECRET_SYNC_MAP } from "@app/helpers/secretSyncs";
import { TSecretSync, useCreateSecretSync } from "@app/hooks/api/secretSyncs";
import { SecretSync } from "@app/hooks/api/secretSyncs/enums";
import { parseFormData } from "@app/views/IntegrationsPage/components/IntegrationsSection/components/SecretSyncsTab/SecretSyncForm/helpers";
import { SecretSyncDetailsFields } from "@app/views/IntegrationsPage/components/IntegrationsSection/components/SecretSyncsTab/SecretSyncForm/SecretSyncDetailsFields";
import { SecretSyncOptionsFields } from "@app/views/IntegrationsPage/components/IntegrationsSection/components/SecretSyncsTab/SecretSyncForm/SecretSyncOptionsFields";

import { DestinationConfigFields } from "./DestinationConfigFields";
import { SecretSyncFormSchema, TSecretSyncForm } from "./schemas";
import { SecretSyncConnectionField } from "./SecretSyncConnectionField";
import { SecretSyncSourceFields } from "./SecretSyncSourceFields";

type Props = {
  onComplete: (secretSync: TSecretSync) => void;
  destination: SecretSync;
  onCancel: () => void;
};

const FORM_TABS: { name: string; key: string; fields: (keyof TSecretSyncForm)[] }[] = [
  { name: "Source", key: "source", fields: ["environment", "secretPath"] },
  { name: "Destination", key: "destination", fields: ["connection", "destinationConfig"] },
  { name: "Options", key: "options", fields: ["syncOptions"] },
  { name: "Details", key: "details", fields: ["name", "description"] }
];

export const CreateSecretSyncForm = ({ destination, onComplete, onCancel }: Props) => {
  const createSecretSync = useCreateSecretSync();
  const { name: destinationName } = SECRET_SYNC_MAP[destination];

  const [selectedTabIndex, setSelectedTabIndex] = useState(0);

  const formMethods = useForm<TSecretSyncForm>({
    resolver: zodResolver(SecretSyncFormSchema),
    defaultValues: {
      destination,
      secretPath: "/"
    },
    reValidateMode: "onChange"
  });

  const onSubmit = async (formData: TSecretSyncForm) => {
    try {
      const secretSync = await createSecretSync.mutateAsync(parseFormData(formData));

      createNotification({
        text: `Successfully added ${destinationName} Sync`,
        type: "success"
      });
      onComplete(secretSync);
    } catch (err: any) {
      console.error(err);
      createNotification({
        title: `Failed to add ${destinationName} Sync`,
        text: err.message,
        type: "error"
      });
    }
  };

  const handlePrev = () => {
    if (selectedTabIndex === 0) {
      onCancel();
      return;
    }

    setSelectedTabIndex((prev) => prev - 1);
  };

  const { handleSubmit, trigger } = formMethods;

  const isStepValid = async (index: number) => trigger(FORM_TABS[index].fields);

  const isFinalStep = selectedTabIndex === FORM_TABS.length - 1;

  const handleNext = async () => {
    if (isFinalStep) {
      handleSubmit(onSubmit)();
      return;
    }

    const isValid = await isStepValid(selectedTabIndex);

    if (!isValid) return;

    setSelectedTabIndex((prev) => prev + 1);
  };

  const isTabEnabled = async (index: number) => {
    let isEnabled = true;
    for (let i = index - 1; i >= 0; i -= 1) {
      // eslint-disable-next-line no-await-in-loop
      isEnabled = isEnabled && (await isStepValid(i));
    }

    return isEnabled;
  };

  return (
    <form>
      <FormProvider {...formMethods}>
        <Tab.Group selectedIndex={selectedTabIndex} onChange={setSelectedTabIndex}>
          <Tab.List className="-pb-1 mb-6 w-full border-b-2 border-mineshaft-600">
            {FORM_TABS.map((tab, index) => (
              <Tab
                onClick={async () => {
                  const isEnabled = await isTabEnabled(index);
                  setSelectedTabIndex((prev) => (isEnabled ? index : prev));
                }}
                className={({ selected }) =>
                  `w-30 -mb-[0.14rem] px-4 py-2 text-sm font-medium outline-none disabled:opacity-60 ${
                    selected
                      ? "border-b-2 border-mineshaft-300 text-mineshaft-300"
                      : "text-mineshaft-400"
                  }`
                }
                key={tab.key}
              >
                {tab.name}
              </Tab>
            ))}
          </Tab.List>
          <Tab.Panels>
            <Tab.Panel>
              <SecretSyncSourceFields />
            </Tab.Panel>
            <Tab.Panel>
              <SecretSyncConnectionField />
              <DestinationConfigFields />
            </Tab.Panel>
            <Tab.Panel>
              <SecretSyncOptionsFields />
            </Tab.Panel>
            <Tab.Panel>
              <SecretSyncDetailsFields />
            </Tab.Panel>
          </Tab.Panels>
        </Tab.Group>
      </FormProvider>
      <div className="flex w-full flex-row-reverse justify-between gap-4 pt-4">
        <Button onClick={handleNext} colorSchema="secondary">
          {isFinalStep ? "Create Sync" : "Next"}
        </Button>
        {selectedTabIndex > 0 && (
          <Button onClick={handlePrev} colorSchema="secondary">
            Back
          </Button>
        )}
      </div>
    </form>
  );
};
