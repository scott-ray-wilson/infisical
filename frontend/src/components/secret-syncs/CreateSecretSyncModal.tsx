import { useEffect, useState } from "react";

import { TSecretSyncForm } from "@app/components/secret-syncs/forms/schemas";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle
} from "@app/components/v3";
import { SecretSync, TSecretSync } from "@app/hooks/api/secretSyncs";

import { CreateSecretSyncForm } from "./forms";
import { SecretSyncModalHeader } from "./SecretSyncModalHeader";
import { SecretSyncSelect } from "./SecretSyncSelect";

type Props = {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  selectSync?: SecretSync | null;
  initialFormData?: Partial<TSecretSyncForm>;
};

type ContentProps = {
  onComplete: (secretSync: TSecretSync) => void;
  selectedSync: SecretSync | null;
  setSelectedSync: (selectedSync: SecretSync | null) => void;
  initialFormData?: Partial<TSecretSyncForm>;
};

const Content = ({ onComplete, setSelectedSync, selectedSync, initialFormData }: ContentProps) => {
  if (selectedSync) {
    return (
      <CreateSecretSyncForm
        initialFormData={initialFormData}
        onComplete={onComplete}
        onCancel={() => setSelectedSync(null)}
        destination={selectedSync}
      />
    );
  }

  return <SecretSyncSelect onSelect={setSelectedSync} />;
};

export const CreateSecretSyncModal = ({
  isOpen,
  onOpenChange,
  selectSync = null,
  initialFormData
}: Props) => {
  const [selectedSync, setSelectedSync] = useState<SecretSync | null>(selectSync);

  useEffect(() => {
    setSelectedSync(selectSync);
  }, [selectSync]);

  return (
    <Sheet
      open={isOpen}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) setSelectedSync(null);
        onOpenChange(nextOpen);
      }}
    >
      <SheetContent className="flex h-full max-h-full flex-col gap-y-0 sm:max-w-5xl">
        <SheetHeader className="border-b">
          <SheetTitle>
            {selectedSync ? (
              <SecretSyncModalHeader isConfigured={false} destination={selectedSync} />
            ) : (
              "Choose a destination"
            )}
          </SheetTitle>
          {!selectedSync && (
            <SheetDescription>
              Where should Infisical write these secrets? You can change this later only by creating
              a new sync.
            </SheetDescription>
          )}
        </SheetHeader>
        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto p-4">
          <Content
            onComplete={() => {
              setSelectedSync(null);
              onOpenChange(false);
            }}
            selectedSync={selectedSync}
            setSelectedSync={setSelectedSync}
            initialFormData={initialFormData}
          />
        </div>
      </SheetContent>
    </Sheet>
  );
};
