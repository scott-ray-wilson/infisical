import { Controller, useFormContext } from "react-hook-form";
import { faCircleInfo } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

import { TSecretRotationV2Form } from "@app/components/secret-rotations-v2/forms/schemas";
import { FormControl, Input, Tooltip } from "@app/components/v2";
import { SecretRotation } from "@app/hooks/api/secretRotationsV2";

export const LdapPasswordRotationParametersFields = () => {
  const { control, watch } = useFormContext<
    TSecretRotationV2Form & {
      type: SecretRotation.LdapPassword;
    }
  >();

  // const connectionId = watch("connection.id");
  //
  // const { data: clients, isPending: isClientsPending } = useAuth0ConnectionListClients(
  //   connectionId,
  //   { enabled: Boolean(connectionId) }
  // );

  return (
    <Controller
      name="parameters.dn"
      control={control}
      render={({ field: { value, onChange }, fieldState: { error } }) => (
        <FormControl
          isError={Boolean(error)}
          errorText={error?.message}
          label="Application"
          helperText={
            <Tooltip
              className="max-w-md"
              content={
                <>
                  Ensure that your connection has the{" "}
                  <span className="font-semibold">read_clients</span> permission and the application
                  exists in the connection&#39;s audience.
                </>
              }
            >
              <div>
                <span>Don&#39;t see the application you&#39;re looking for?</span>{" "}
                <FontAwesomeIcon icon={faCircleInfo} className="text-mineshaft-400" />
              </div>
            </Tooltip>
          }
        >
          {/* <FilterableSelect
            menuPlacement="top"
            isLoading={isClientsPending && Boolean(connectionId)}
            isDisabled={!connectionId}
            value={clients?.find((client) => client.id === value) ?? null}
            onChange={(option) => {
              onChange((option as SingleValue<TAuth0Client>)?.id ?? null);
            }}
            options={clients}
            placeholder="Select an application..."
            getOptionLabel={(option) => option.name}
            getOptionValue={(option) => option.id}
          /> */}
          <Input
            value={value}
            onChange={onChange}
            placeholder="CN=John,OU=Users,DC=example,DC=com"
          />
        </FormControl>
      )}
    />
  );
};
