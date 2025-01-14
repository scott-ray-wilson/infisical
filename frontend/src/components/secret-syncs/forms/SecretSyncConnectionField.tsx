import { Controller, useFormContext } from "react-hook-form";

import { FilterableSelect, FormControl } from "@app/components/v2";
import { OrgPermissionActions, OrgPermissionSubjects, useOrgPermission } from "@app/context";
import { APP_CONNECTION_MAP } from "@app/helpers/appConnections";
import { SECRET_SYNC_CONNECTION_MAP } from "@app/helpers/secretSyncs";
import { useListAvailableAppConnections } from "@app/hooks/api/appConnections";

import { TSecretSyncForm } from "./schemas";

type Props = {
  isEditing?: boolean;
};

export const SecretSyncConnectionField = ({ isEditing }: Props) => {
  const { permission } = useOrgPermission();
  const { control, watch } = useFormContext<TSecretSyncForm>();

  const destination = watch("destination");
  const app = SECRET_SYNC_CONNECTION_MAP[destination];

  const { data: options, isLoading } = useListAvailableAppConnections(app);

  const connectionName = APP_CONNECTION_MAP[app].name;

  const canCreateConnection = permission.can(
    OrgPermissionActions.Create,
    OrgPermissionSubjects.AppConnections
  );

  return (
    <>
      <p className="mb-4 text-sm text-bunker-300">
        {isEditing
          ? "Configure the sync destination."
          : `Specify the App Connection to use to connect to ${connectionName} and configure destination
        parameters.`}
      </p>
      <Controller
        render={({ field: { value, onChange }, fieldState: { error } }) => (
          <FormControl
            tooltipText={
              isEditing
                ? undefined
                : "App Connections can be created from the Organization Settings page."
            }
            isError={Boolean(options?.length === 0) || Boolean(error)}
            errorText={
              options?.length === 0
                ? `You do not have access to any ${connectionName} connections. ${
                    canCreateConnection
                      ? "Create a connection from the Organization Settings page."
                      : ""
                  }`
                : error?.message
            }
            label={`${connectionName} Connection`}
            helperText={isEditing ? "Connection cannot be changed" : ""}
          >
            <FilterableSelect
              value={value}
              isDisabled={isEditing}
              onChange={onChange}
              isLoading={isLoading}
              options={options}
              placeholder="Select connection..."
              getOptionLabel={(option) => option.name}
              getOptionValue={(option) => option.id}
            />
          </FormControl>
        )}
        control={control}
        name="connection"
      />
    </>
  );
};
