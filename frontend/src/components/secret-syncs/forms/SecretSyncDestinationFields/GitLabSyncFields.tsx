import { Controller, useFormContext, useWatch } from "react-hook-form";
import { SingleValue } from "react-select";
import { CircleHelp, Info } from "lucide-react";

import { SecretSyncConnectionField } from "@app/components/secret-syncs/forms/SecretSyncConnectionField";
import {
  Field,
  FieldContent,
  FieldError,
  FieldGroup,
  FieldLabel,
  FilterableSelect,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Switch,
  Tooltip,
  TooltipContent,
  TooltipTrigger
} from "@app/components/v3";
import {
  TGitLabGroup,
  TGitLabProject,
  useGitLabConnectionListGroups,
  useGitLabConnectionListProjects
} from "@app/hooks/api/appConnections/gitlab";
import { SecretSync } from "@app/hooks/api/secretSyncs";
import { GitLabSyncScope } from "@app/hooks/api/secretSyncs/types/gitlab-sync";

import { TSecretSyncForm } from "../schemas";

const SecretProtectionOption = ({
  title,
  isEnabled,
  onChange,
  id,
  isDisabled = false,
  tooltip
}: {
  title: string;
  isEnabled: boolean;
  onChange: (checked: boolean) => void;
  id: string;
  isDisabled?: boolean;
  tooltip?: string;
}) => {
  return (
    <Field orientation="horizontal">
      <FieldContent>
        <FieldLabel htmlFor={id}>
          {title}
          {tooltip && (
            <Tooltip>
              <TooltipTrigger asChild>
                <CircleHelp />
              </TooltipTrigger>
              <TooltipContent className="max-w-md">{tooltip}</TooltipContent>
            </Tooltip>
          )}
        </FieldLabel>
      </FieldContent>
      <Switch
        id={id}
        checked={isEnabled}
        onCheckedChange={onChange}
        disabled={isDisabled}
      />
    </Field>
  );
};

export const GitLabSyncFields = () => {
  const { control, setValue } = useFormContext<
    TSecretSyncForm & { destination: SecretSync.GitLab }
  >();

  const connectionId = useWatch({ name: "connection.id", control });
  const scope = useWatch({ name: "destinationConfig.scope", control });
  const shouldMaskSecrets = useWatch({ name: "destinationConfig.shouldMaskSecrets", control });

  const { data: groups, isLoading: isGroupsLoading } = useGitLabConnectionListGroups(connectionId, {
    enabled: Boolean(connectionId) && scope === GitLabSyncScope.Group
  });

  const { data: projects, isLoading: isProjectsLoading } = useGitLabConnectionListProjects(
    connectionId,
    {
      enabled: Boolean(connectionId)
    }
  );

  return (
    <FieldGroup>
      <SecretSyncConnectionField
        onChange={() => {
          setValue("destinationConfig.projectId", "");
          setValue("destinationConfig.projectName", "");
          setValue("destinationConfig.groupId", "");
          setValue("destinationConfig.groupName", "");
          setValue("destinationConfig.scope", GitLabSyncScope.Project);
        }}
      />

      <Controller
        name="destinationConfig.scope"
        control={control}
        defaultValue={GitLabSyncScope.Project}
        render={({ field: { value, onChange }, fieldState: { error } }) => (
          <Field>
            <FieldLabel>Scope</FieldLabel>
            <FieldContent>
              <Select
                value={value}
                onValueChange={(val) => {
                  onChange(val);
                  setValue("destinationConfig.projectId", "");
                  setValue("destinationConfig.projectName", "");
                  setValue("destinationConfig.groupId", "");
                  setValue("destinationConfig.groupName", "");
                }}
              >
                <SelectTrigger className="w-full capitalize" isError={Boolean(error)}>
                  <SelectValue placeholder="Select a scope..." />
                </SelectTrigger>
                <SelectContent>
                  {Object.values(GitLabSyncScope).map((projectScope) => (
                    <SelectItem className="capitalize" value={projectScope} key={projectScope}>
                      {projectScope.replace("-", " ")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FieldError errors={[error]} />
            </FieldContent>
          </Field>
        )}
      />

      {scope === GitLabSyncScope.Group && (
        <Controller
          name="destinationConfig.groupId"
          control={control}
          render={({ field: { value, onChange }, fieldState: { error } }) => (
            <Field>
              <FieldLabel>
                Group
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-md">
                    Ensure the group exists in the connection&apos;s GitLab instance URL.
                  </TooltipContent>
                </Tooltip>
              </FieldLabel>
              <FieldContent>
                <FilterableSelect
                  menuPlacement="top"
                  isLoading={isGroupsLoading && Boolean(connectionId)}
                  isDisabled={!connectionId}
                  value={groups?.find((group) => group.id === value) ?? null}
                  onChange={(option) => {
                    onChange((option as SingleValue<TGitLabGroup>)?.id ?? "");
                    setValue(
                      "destinationConfig.groupName",
                      (option as SingleValue<TGitLabGroup>)?.fullName ?? ""
                    );
                  }}
                  options={groups}
                  placeholder="Select a group..."
                  getOptionLabel={(option) => option.fullName}
                  getOptionValue={(option) => option.id}
                />
                <FieldError errors={[error]} />
              </FieldContent>
            </Field>
          )}
        />
      )}

      {scope === GitLabSyncScope.Project && (
        <Controller
          name="destinationConfig.projectId"
          control={control}
          render={({ field: { value, onChange }, fieldState: { error } }) => (
            <Field>
              <FieldLabel>
                GitLab Project
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-md">
                    Ensure the project exists in the connection&apos;s GitLab instance URL and the
                    connection has access to it.
                  </TooltipContent>
                </Tooltip>
              </FieldLabel>
              <FieldContent>
                <FilterableSelect
                  menuPlacement="top"
                  isLoading={isProjectsLoading && Boolean(connectionId)}
                  isDisabled={!connectionId}
                  value={projects?.find((project) => project.id === value) ?? null}
                  onChange={(option) => {
                    onChange((option as SingleValue<TGitLabProject>)?.id ?? "");
                    setValue(
                      "destinationConfig.projectName",
                      (option as SingleValue<TGitLabProject>)?.name ?? ""
                    );
                  }}
                  options={projects}
                  placeholder="Select a project..."
                  getOptionLabel={(option) => option.name}
                  getOptionValue={(option) => option.id}
                />
                <FieldError errors={[error]} />
              </FieldContent>
            </Field>
          )}
        />
      )}

      <Controller
        control={control}
        defaultValue=""
        name="destinationConfig.targetEnvironment"
        render={({ field, fieldState: { error } }) => (
          <Field>
            <FieldLabel>GitLab Environment Scope (Optional)</FieldLabel>
            <FieldContent>
              <Input {...field} placeholder="*" isError={Boolean(error)} />
              <FieldError errors={[error]} />
            </FieldContent>
          </Field>
        )}
      />

      <div className="flex flex-col gap-2">
        <Controller
          control={control}
          name="destinationConfig.shouldProtectSecrets"
          render={({ field: { onChange, value } }) => (
            <SecretProtectionOption
              id="should-protect-secrets"
              title="Mark secrets as Protected"
              isEnabled={value || false}
              onChange={onChange}
            />
          )}
        />

        <Controller
          control={control}
          name="destinationConfig.shouldMaskSecrets"
          render={({ field: { onChange, value } }) => (
            <SecretProtectionOption
              id="should-mask-secrets"
              title="Mark secrets as Masked"
              tooltip="GitLab has limitations for masked variables: secrets must be at least 8 characters long and not match existing CI/CD variable names. Secrets not meeting these criteria won't be masked."
              isEnabled={value || false}
              onChange={(checked) => {
                onChange(checked);
                if (!checked) {
                  setValue("destinationConfig.shouldHideSecrets", false);
                }
              }}
            />
          )}
        />

        <Controller
          control={control}
          name="destinationConfig.shouldHideSecrets"
          render={({ field: { onChange, value } }) => (
            <SecretProtectionOption
              id="should-hide-secrets"
              title="Mark secrets as Hidden"
              tooltip="Secrets can only be marked as hidden if they are also masked. If this is enabled, Infisical will not be able to unhide/unmask secrets from the sync destination if you disable the option later."
              isEnabled={value || false}
              onChange={onChange}
              isDisabled={!shouldMaskSecrets}
            />
          )}
        />
      </div>
    </FieldGroup>
  );
};
