import { Controller, useFormContext } from "react-hook-form";

import { FormControl, Input } from "@app/components/v2";

import { TCreateSecretSyncForm } from "./schemas";

export const SecretSyncOptionsFields = () => {
  const { control } = useFormContext<TCreateSecretSyncForm>();

  return (
    <>
      <p className="mb-4 text-sm text-bunker-300">
        Configure optional parameters to modify how secrets are synced.
      </p>
      <Controller
        render={({ field: { value, onChange }, fieldState: { error } }) => (
          <FormControl
            isError={Boolean(error)}
            isOptional
            errorText={error?.message}
            label="Prepend Prefix"
          >
            <Input className="uppercase" value={value} onChange={onChange} placeholder="INF_" />
          </FormControl>
        )}
        control={control}
        name="syncOptions.prependPrefix"
      />
      <Controller
        render={({ field: { value, onChange }, fieldState: { error } }) => (
          <FormControl
            isError={Boolean(error)}
            isOptional
            errorText={error?.message}
            label="Append Suffix"
          >
            <Input className="uppercase" value={value} onChange={onChange} placeholder="_INF" />
          </FormControl>
        )}
        control={control}
        name="syncOptions.appendSuffix"
      />
    </>
  );
};
