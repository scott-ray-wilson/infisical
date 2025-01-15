import { useEffect } from "react";
import { Controller, useFormContext, useWatch } from "react-hook-form";
import { SingleValue } from "react-select";

import { FilterableSelect, FormControl, Select, SelectItem } from "@app/components/v2";
import {
  TGitHubConnectionOrganization,
  TGitHubConnectionRepository,
  useGitHubConnectionListOrganizations,
  useGitHubConnectionListRepositories
} from "@app/hooks/api/appConnections/github";
import { SecretSync } from "@app/hooks/api/secretSyncs";
import {
  GitHubSyncScope,
  GitHubSyncVisibility
} from "@app/hooks/api/secretSyncs/types/github-sync";

import { TSecretSyncForm } from "../schemas";

export const GitHubSyncFields = () => {
  const {
    control,
    formState: { errors },
    watch,
    setValue
  } = useFormContext<TSecretSyncForm & { destination: SecretSync.GitHub }>();

  console.log("errors", errors, watch());

  const connectionId = useWatch({ name: "connection.id", control });
  const currentScope = watch("destinationConfig.scope", GitHubSyncScope.Repository);
  const currentVisibility = watch("destinationConfig.visibility", GitHubSyncVisibility.All);

  const { data: repositories = [], isPending: isRepositoriesPending } =
    useGitHubConnectionListRepositories(connectionId, {
      enabled: Boolean(connectionId)
    });

  const { data: organizations = [], isPending: isOrganizationsPending } =
    useGitHubConnectionListOrganizations(connectionId, {
      enabled: Boolean(connectionId && currentScope === GitHubSyncScope.Organization)
    });

  useEffect(() => {
    setValue("destinationConfig.org", "");
    setValue("destinationConfig.repo", "");
    setValue("destinationConfig.owner", "");
    setValue("destinationConfig.visibility", GitHubSyncVisibility.All);
  }, [connectionId]);

  return (
    <>
      <Controller
        name="destinationConfig.scope"
        control={control}
        defaultValue={GitHubSyncScope.Repository}
        render={({ field: { value, onChange }, fieldState: { error } }) => (
          <FormControl errorText={error?.message} isError={Boolean(error?.message)} label="Scope">
            <Select
              value={value}
              onValueChange={(val) => {
                onChange(val);
              }}
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
      {currentScope === GitHubSyncScope.Organization && (
        <>
          <Controller
            name="destinationConfig.org"
            control={control}
            render={({ field: { value, onChange }, fieldState: { error } }) => (
              <FormControl isError={Boolean(error)} errorText={error?.message} label="Organization">
                <FilterableSelect
                  isLoading={isOrganizationsPending}
                  value={organizations.find((org) => org.login === value) ?? null}
                  onChange={(option) =>
                    onChange((option as SingleValue<TGitHubConnectionOrganization>)?.login ?? null)
                  }
                  options={organizations}
                  placeholder="Select an organization..."
                  getOptionLabel={(option) => option.login}
                  getOptionValue={(option) => option.login}
                />
              </FormControl>
            )}
          />
          <Controller
            name="destinationConfig.visibility"
            control={control}
            defaultValue={GitHubSyncVisibility.All}
            render={({ field: { value, onChange }, fieldState: { error } }) => (
              <FormControl
                errorText={error?.message}
                isError={Boolean(error?.message)}
                label="Visibility"
              >
                <Select
                  value={value}
                  onValueChange={(val) => {
                    onChange(val);
                  }}
                  className="w-full border border-mineshaft-500 capitalize"
                  position="popper"
                  placeholder="Select visibility..."
                  dropdownContainerClassName="max-w-none"
                >
                  {Object.values(GitHubSyncVisibility).map((scope) => (
                    <SelectItem className="capitalize" value={scope} key={scope}>
                      {scope.replace("-", " ")}
                    </SelectItem>
                  ))}
                </Select>
              </FormControl>
            )}
          />
        </>
      )}
      {currentScope !== GitHubSyncScope.Organization && (
        <Controller
          render={({ field: { value, onChange }, fieldState: { error } }) => (
            <FormControl isError={Boolean(error)} errorText={error?.message} label="Repository">
              <FilterableSelect
                isLoading={isRepositoriesPending}
                value={repositories.find((repo) => repo.name === value) ?? null}
                onChange={(option) => {
                  const repo = option as SingleValue<TGitHubConnectionRepository>;

                  onChange(repo?.name);
                  setValue("destinationConfig.owner", repo?.owner.login ?? "");
                }}
                options={repositories}
                placeholder="Select a repository..."
                getOptionLabel={(option) => `${option.owner.login}/${option.name}`}
                getOptionValue={(option) => option.id.toString()}
              />
            </FormControl>
          )}
          control={control}
          name="destinationConfig.repo"
        />
      )}
    </>
  );
};
