import { Fragment } from "react";
import { Controller, useFieldArray, useFormContext, useWatch } from "react-hook-form";
import { SingleValue } from "react-select";
import { CircleHelp, Plus, Trash2 } from "lucide-react";

import {
  Button,
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldLabel,
  FieldTitle,
  FilterableSelect,
  IconButton,
  Input,
  Switch,
  Tooltip,
  TooltipContent,
  TooltipTrigger
} from "@app/components/v3";
import {
  TAwsConnectionKmsKey,
  useListAwsConnectionKmsKeys
} from "@app/hooks/api/appConnections/aws";
import { SecretSync } from "@app/hooks/api/secretSyncs";

import { TSecretSyncForm } from "../schemas";

const AwsTagsSection = () => {
  const { control } = useFormContext<
    TSecretSyncForm & { destination: SecretSync.AWSParameterStore }
  >();

  const tagFields = useFieldArray({
    control,
    name: "syncOptions.tags"
  });

  return (
    <div className="mt-2.5 flex flex-col gap-2">
      <div className="grid max-h-[20vh] grid-cols-12 items-end gap-2 overflow-y-auto">
        {tagFields.fields.map(({ id: tagFieldId }, i) => (
          <Fragment key={tagFieldId}>
            <div className="col-span-5">
              {i === 0 && <p className="mb-1 text-xs text-muted">Key</p>}
              <Controller
                control={control}
                name={`syncOptions.tags.${i}.key`}
                render={({ field, fieldState: { error } }) => (
                  <Input {...field} isError={Boolean(error)} />
                )}
              />
            </div>
            <div className="col-span-6">
              {i === 0 && <p className="mb-1 text-xs text-muted">Value (optional)</p>}
              <Controller
                control={control}
                name={`syncOptions.tags.${i}.value`}
                render={({ field, fieldState: { error } }) => (
                  <Input {...field} isError={Boolean(error)} />
                )}
              />
            </div>
            <div className="col-span-1 flex justify-end">
              <IconButton
                variant="ghost-muted"
                aria-label="Remove tag"
                size="sm"
                onClick={() => tagFields.remove(i)}
              >
                <Trash2 />
              </IconButton>
            </div>
          </Fragment>
        ))}
      </div>
      <div className="flex">
        <Button
          variant="outline"
          size="xs"
          onClick={() => tagFields.append({ key: "", value: "" })}
        >
          <Plus />
          Add tag
        </Button>
      </div>
    </div>
  );
};

export const AwsParameterStoreSyncOptionsFields = () => {
  const { control, watch, setValue } = useFormContext<
    TSecretSyncForm & { destination: SecretSync.AWSParameterStore }
  >();

  const region = watch("destinationConfig.region");
  const connectionId = useWatch({ name: "connection.id", control });
  const watchedTags = watch("syncOptions.tags");

  const { data: kmsKeys = [], isPending: isKmsKeysPending } = useListAwsConnectionKmsKeys(
    {
      connectionId,
      region,
      destination: SecretSync.AWSParameterStore
    },
    { enabled: Boolean(connectionId && region) }
  );

  return (
    <>
      <Controller
        name="syncOptions.keyId"
        control={control}
        render={({ field: { value, onChange }, fieldState: { error } }) => (
          <Field className="mb-4">
            <FieldLabel className="flex items-center gap-1.5">
              KMS Key
              <Tooltip>
                <TooltipTrigger asChild>
                  <CircleHelp className="size-3 cursor-help text-muted" />
                </TooltipTrigger>
                <TooltipContent>The AWS KMS key to encrypt parameters with.</TooltipContent>
              </Tooltip>
            </FieldLabel>
            <FieldContent>
              <FilterableSelect
                isLoading={isKmsKeysPending && Boolean(connectionId && region)}
                isDisabled={!connectionId}
                value={kmsKeys.find((org) => org.alias === value) ?? null}
                onChange={(option) =>
                  onChange((option as SingleValue<TAwsConnectionKmsKey>)?.alias ?? null)
                }
                isError={Boolean(error)}
                // eslint-disable-next-line react/no-unstable-nested-components
                noOptionsMessage={({ inputValue }) =>
                  inputValue ? undefined : (
                    <p>
                      To configure a KMS key, ensure the following permissions are present on the
                      selected IAM role:{" "}
                      <span className="rounded-sm bg-mineshaft-600 text-mineshaft-300">
                        &#34;kms:ListAliases&#34;
                      </span>
                      ,{" "}
                      <span className="rounded-sm bg-mineshaft-600 text-mineshaft-300">
                        &#34;kms:DescribeKey&#34;
                      </span>
                      ,{" "}
                      <span className="rounded-sm bg-mineshaft-600 text-mineshaft-300">
                        &#34;kms:Encrypt&#34;
                      </span>
                      ,{" "}
                      <span className="rounded-sm bg-mineshaft-600 text-mineshaft-300">
                        &#34;kms:Decrypt&#34;
                      </span>
                      .
                    </p>
                  )
                }
                options={kmsKeys}
                placeholder="Leave blank to use default KMS key"
                getOptionLabel={(option) =>
                  option.alias === "alias/aws/ssm" ? `${option.alias} (Default)` : option.alias
                }
                getOptionValue={(option) => option.alias}
              />
            </FieldContent>
            <FieldError errors={[error]} />
          </Field>
        )}
      />

      <div className="mb-4">
        <FieldLabel htmlFor="configure-resource-tags">
          <Field orientation="horizontal">
            <FieldContent>
              <FieldTitle>Configure resource tags</FieldTitle>
              <FieldDescription>
                Overwrite AWS resource tags on synced parameters with static values defined below.
              </FieldDescription>
            </FieldContent>
            <Switch
              id="configure-resource-tags"
              variant="project"
              checked={Array.isArray(watchedTags)}
              onCheckedChange={(isChecked) => {
                if (isChecked) {
                  setValue("syncOptions.tags", []);
                } else {
                  setValue("syncOptions.tags", undefined);
                }
              }}
            />
          </Field>
          {Array.isArray(watchedTags) && <AwsTagsSection />}
        </FieldLabel>
      </div>

      <Controller
        name="syncOptions.syncSecretMetadataAsTags"
        control={control}
        render={({ field: { value, onChange }, fieldState: { error } }) => (
          <Field className="mb-4">
            <FieldLabel htmlFor="sync-secret-metadata-tags">
              <Field orientation="horizontal">
                <FieldContent>
                  <FieldTitle>Sync secret metadata as resource tags</FieldTitle>
                  <FieldDescription>
                    Metadata attached to secrets is added as resource tags on parameters synced by
                    Infisical. Manually configured tags above take precedence when keys conflict.
                  </FieldDescription>
                </FieldContent>
                <Switch
                  id="sync-secret-metadata-tags"
                  variant="project"
                  checked={value}
                  onCheckedChange={onChange}
                />
              </Field>
            </FieldLabel>
            <FieldError errors={[error]} />
          </Field>
        )}
      />
    </>
  );
};
