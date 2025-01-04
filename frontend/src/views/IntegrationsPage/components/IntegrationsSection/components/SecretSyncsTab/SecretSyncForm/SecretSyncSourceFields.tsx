import { Controller, useFormContext } from "react-hook-form";

import { FilterableSelect, FormControl } from "@app/components/v2";
import { SecretPathInput } from "@app/components/v2/SecretPathInput";
import { useWorkspace } from "@app/context";

import { TSecretSyncForm } from "./schemas";

export const SecretSyncSourceFields = () => {
  const { control, watch } = useFormContext<TSecretSyncForm>();

  const { currentWorkspace } = useWorkspace();

  const selectedEnvironment = watch("environment");

  return (
    <>
      <p className="mb-4 text-sm text-bunker-300">
        Specify the environment and path from Infisical where you would like to sync secrets from.
      </p>
      <Controller
        render={({ field: { value, onChange }, fieldState: { error } }) => (
          <FormControl isError={Boolean(error)} errorText={error?.message} label="Environment">
            <FilterableSelect
              value={value}
              onChange={onChange}
              options={currentWorkspace?.environments}
              placeholder="Select environment..."
              getOptionLabel={(option) => option.name}
              getOptionValue={(option) => option.id}
            />
          </FormControl>
        )}
        control={control}
        name="environment"
      />
      <Controller
        render={({ field: { value, onChange }, fieldState: { error } }) => (
          <FormControl isError={Boolean(error)} errorText={error?.message} label="Secret Path">
            <SecretPathInput
              isDisabled={!selectedEnvironment}
              value={value}
              onChange={onChange}
              environment={selectedEnvironment?.slug}
              placeholder="Secret path..."
            />
          </FormControl>
        )}
        control={control}
        name="secretPath"
      />
    </>
  );
};
