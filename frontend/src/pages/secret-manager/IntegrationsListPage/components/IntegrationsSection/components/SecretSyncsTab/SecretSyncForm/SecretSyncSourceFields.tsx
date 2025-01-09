import { useState } from "react";
import { Controller, useFormContext } from "react-hook-form";
import { SingleValue } from "react-select";

import { FilterableSelect, FormControl, Spinner } from "@app/components/v2";
import { useWorkspace } from "@app/context";
import { useGetProjectSecretsQuickSearch } from "@app/hooks/api/dashboard";
import { WorkspaceEnv } from "@app/hooks/api/workspace/types";

import { TCreateSecretSyncForm } from "./schemas";

export const SecretSyncSourceFields = () => {
  const { control, watch } = useFormContext<TCreateSecretSyncForm>();

  const { currentWorkspace } = useWorkspace();
  const [inputValue, setInputValue] = useState<string>("/");

  const [selectedEnv, setSelectedEnv] = useState<WorkspaceEnv | null>(
    currentWorkspace.environments[0]
  );

  const currentPath = watch("folder.path");

  const { data, isPending } = useGetProjectSecretsQuickSearch(
    {
      secretPath: "/",
      environments: [selectedEnv!.slug],
      projectId: currentWorkspace.id,
      search: inputValue || currentPath,
      tags: {}
    },
    {
      placeholderData: (prev) => prev
    }
  );

  const folders = Object.values(data?.folders ?? {}).map((group) => group[0]);

  if (isPending)
    return (
      <div className="flex h-full w-full items-center justify-center">
        <Spinner />
      </div>
    );

  return (
    <>
      <p className="mb-4 text-sm text-bunker-300">
        Specify the environment and path from Infisical where you would like to sync secrets from.
      </p>

      <FormControl label="Environment">
        <FilterableSelect
          value={selectedEnv}
          onChange={(newValue) => setSelectedEnv(newValue as SingleValue<WorkspaceEnv>)}
          options={currentWorkspace.environments}
          placeholder="Select environment..."
          getOptionLabel={(option) => option?.name}
          getOptionValue={(option) => option?.id}
        />
      </FormControl>
      <Controller
        defaultValue={folders[0]}
        render={({ field: { value, onChange }, fieldState: { error } }) => (
          <FormControl
            helperText="Nested folders will display as you complete paths"
            isError={Boolean(error)}
            errorText={error?.message}
            label="Secret Path"
          >
            <FilterableSelect
              isLoading={isPending}
              inputValue={inputValue}
              onInputChange={setInputValue}
              value={value}
              onChange={onChange}
              options={folders}
              placeholder="Specify path..."
              getOptionLabel={(option) => option?.path}
              getOptionValue={(option) => option?.id}
            />
          </FormControl>
        )}
        control={control}
        name="folder"
      />
    </>
  );
};
