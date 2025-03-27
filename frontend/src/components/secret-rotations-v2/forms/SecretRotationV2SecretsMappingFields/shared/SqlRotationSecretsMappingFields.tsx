import { Controller, useFormContext } from "react-hook-form";

import { TSecretRotationV2Form } from "@app/components/secret-rotations-v2/forms/schemas";
import { FormControl, Input } from "@app/components/v2";
import { SecretRotation } from "@app/hooks/api/secretRotationsV2";

export const SqlRotationSecretsMappingFields = () => {
  const { control } = useFormContext<
    TSecretRotationV2Form & {
      type: SecretRotation.PostgresCredentials; // all sql rotations share these fields
    }
  >();

  return (
    <>
      <Controller
        render={({ field: { value, onChange }, fieldState: { error } }) => (
          <FormControl
            isError={Boolean(error)}
            errorText={error?.message}
            label="Username Secret Key"
            tooltipText="The Name of the Secret that the username credentials will be mapped to."
          >
            <Input value={value} onChange={onChange} placeholder="DB_USERNAME" />
          </FormControl>
        )}
        control={control}
        name="secretsMapping.username"
      />
      <Controller
        render={({ field: { value, onChange }, fieldState: { error } }) => (
          <FormControl
            isError={Boolean(error)}
            errorText={error?.message}
            label="Password Secret Key"
            tooltipText="The Name of the secret that the password credentials will be mapped to."
          >
            <Input value={value} onChange={onChange} placeholder="DB_PASSWORD" />
          </FormControl>
        )}
        control={control}
        name="secretsMapping.password"
      />
    </>
  );
};
