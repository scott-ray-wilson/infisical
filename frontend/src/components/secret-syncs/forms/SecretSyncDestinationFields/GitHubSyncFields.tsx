import { Controller, useFormContext } from "react-hook-form";

import { FormControl, Select, SelectItem } from "@app/components/v2";
import { SecretSync } from "@app/hooks/api/secretSyncs";
import { GitHubSyncScope } from "@app/hooks/api/secretSyncs/types/github-sync";

import { TSecretSyncForm } from "../schemas";

export const GitHubSyncFields = () => {
  const { control } = useFormContext<TSecretSyncForm & { destination: SecretSync.GitHub }>();

  return (
    <Controller
      name="destinationConfig.scope"
      control={control}
      defaultValue={GitHubSyncScope.Repository}
      render={({ field: { value, onChange }, fieldState: { error } }) => (
        <FormControl errorText={error?.message} isError={Boolean(error?.message)} label="Scope">
          <Select
            value={value}
            onValueChange={(val) => onChange(val)}
            className="w-full border border-mineshaft-500 capitalize"
            position="popper"
            placeholder="Select a scope..."
            dropdownContainerClassName="max-w-none"
          >
            {Object.values(GitHubSyncScope).map((scope) => (
              <SelectItem className="capitalize" value={scope} key={scope}>
                {scope.replace("-", " ")}
              </SelectItem>
            ))}
          </Select>
        </FormControl>
      )}
    />
  );
};
