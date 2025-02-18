import { Fragment, useEffect, useState } from "react";
import { Controller, useFieldArray, useFormContext, useWatch } from "react-hook-form";
import { SingleValue } from "react-select";
import { faPlus, faQuestionCircle, faTrash } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

import { SecretSyncConnectionField } from "@app/components/secret-syncs/forms/SecretSyncConnectionField";
import {
  Button,
  FilterableSelect,
  FormControl,
  FormLabel,
  IconButton,
  Input,
  Switch,
  Tab,
  TabList,
  TabPanel,
  Tabs,
  Tooltip
} from "@app/components/v2";
import {
  TAwsConnectionKmsKey,
  useListAwsConnectionKmsKeys
} from "@app/hooks/api/appConnections/aws";
import { SecretSync } from "@app/hooks/api/secretSyncs";

import { TSecretSyncForm } from "../schemas";
import { AwsRegionSelect } from "./shared";

enum TabSection {
  Configuration = "configuration",
  Advanced = "advanced"
}

export const AwsParameterStoreSyncFields = () => {
  const {
    control,
    watch,
    formState: { errors },
    setValue
  } = useFormContext<TSecretSyncForm & { destination: SecretSync.AWSParameterStore }>();

  const region = watch("destinationConfig.region");
  const connectionId = useWatch({ name: "connection.id", control });
  const [tabValue, setTabValue] = useState<TabSection>(TabSection.Configuration);

  const { data: kmsKeys = [], isPending: isKmsKeysPending } = useListAwsConnectionKmsKeys(
    {
      connectionId,
      region,
      destination: SecretSync.AWSParameterStore
    },
    { enabled: Boolean(connectionId && region) }
  );

  const tagFields = useFieldArray({
    control,
    name: "destinationConfig.tags"
  });

  useEffect(() => {
    if (errors.destinationConfig) {
      setTabValue(
        errors.destinationConfig.keyId || errors.destinationConfig.tags
          ? TabSection.Advanced
          : TabSection.Configuration
      );
    }
  }, [errors]);

  return (
    <Tabs value={tabValue} onValueChange={(value) => setTabValue(value as TabSection)}>
      <TabList>
        <div className="flex w-full flex-row border-b border-mineshaft-600">
          <Tab value={TabSection.Configuration}>Configuration</Tab>
          <Tab value={TabSection.Advanced}>Advanced</Tab>
        </div>
      </TabList>
      <TabPanel value={TabSection.Configuration}>
        <SecretSyncConnectionField
          onChange={() => {
            setValue("destinationConfig.keyId", undefined);
          }}
        />
        <Controller
          render={({ field: { value, onChange }, fieldState: { error } }) => (
            <FormControl isError={Boolean(error)} errorText={error?.message} label="Region">
              <AwsRegionSelect value={value} onChange={onChange} />
            </FormControl>
          )}
          control={control}
          name="destinationConfig.region"
        />
        <Controller
          render={({ field: { value, onChange }, fieldState: { error } }) => (
            <FormControl isError={Boolean(error)} errorText={error?.message} label="Path">
              <Input value={value} onChange={onChange} placeholder="Path..." />
            </FormControl>
          )}
          control={control}
          name="destinationConfig.path"
        />
      </TabPanel>
      <TabPanel value={TabSection.Advanced}>
        <Controller
          name="destinationConfig.keyId"
          control={control}
          render={({ field: { value, onChange }, fieldState: { error } }) => (
            <FormControl
              tooltipText="The AWS KMS key to encrypt parameters with"
              isError={Boolean(error)}
              errorText={error?.message}
              label="KMS Key"
            >
              <FilterableSelect
                isClearable
                isLoading={isKmsKeysPending && Boolean(connectionId && region)}
                isDisabled={!connectionId}
                value={kmsKeys.find((org) => org.alias === value) ?? null}
                onChange={(option) =>
                  onChange((option as SingleValue<TAwsConnectionKmsKey>)?.alias ?? null)
                }
                options={kmsKeys}
                placeholder="Leave blank to use default KMS key"
                getOptionLabel={(option) => option.alias}
                getOptionValue={(option) => option.alias}
              />
            </FormControl>
          )}
        />
        <FormLabel
          label="Resource Tags"
          tooltipText="Add resource tags to parameters synced by Infisical"
        />
        <div className="mb-3 grid max-h-[40vh] grid-cols-12 flex-col items-end gap-2 overflow-y-auto">
          {tagFields.fields.map(({ id: tagFieldId }, i) => (
            <Fragment key={tagFieldId}>
              <div className="col-span-5">
                {i === 0 && <span className="text-xs text-mineshaft-400">Key</span>}
                <Controller
                  control={control}
                  name={`destinationConfig.tags.${i}.key`}
                  render={({ field, fieldState: { error } }) => (
                    <FormControl
                      isError={Boolean(error?.message)}
                      errorText={error?.message}
                      className="mb-0"
                    >
                      <Input className="text-xs" {...field} />
                    </FormControl>
                  )}
                />
              </div>
              <div className="col-span-6">
                {i === 0 && (
                  <FormLabel label="Value" className="text-xs text-mineshaft-400" isOptional />
                )}
                <Controller
                  control={control}
                  name={`destinationConfig.tags.${i}.value`}
                  render={({ field, fieldState: { error } }) => (
                    <FormControl
                      isError={Boolean(error?.message)}
                      errorText={error?.message}
                      className="mb-0"
                    >
                      <Input className="text-xs" {...field} />
                    </FormControl>
                  )}
                />
              </div>
              <Tooltip content="Remove tag" position="right">
                <IconButton
                  variant="plain"
                  ariaLabel="Remove tag"
                  className="col-span-1 mb-1.5"
                  colorSchema="danger"
                  size="xs"
                  onClick={() => tagFields.remove(i)}
                >
                  <FontAwesomeIcon icon={faTrash} />
                </IconButton>
              </Tooltip>
            </Fragment>
          ))}
        </div>
        <div className="mt-2 flex">
          <Button
            leftIcon={<FontAwesomeIcon icon={faPlus} />}
            size="xs"
            variant="outline_bg"
            onClick={() => tagFields.append({ key: "", value: "" })}
          >
            Add Tag
          </Button>
        </div>
        <Controller
          name="destinationConfig.syncSecretMetadataAsTags"
          control={control}
          render={({ field: { value, onChange }, fieldState: { error } }) => (
            <FormControl
              className="mt-6"
              isError={Boolean(error?.message)}
              errorText={error?.message}
            >
              <Switch
                className="bg-mineshaft-400/50 shadow-inner data-[state=checked]:bg-green/80"
                id="overwrite-existing-secrets"
                thumbClassName="bg-mineshaft-800"
                isChecked={value}
                onCheckedChange={onChange}
              >
                <p className="w-[18rem]">
                  Sync Secret Metadata as Resource Tags{" "}
                  <Tooltip
                    className="max-w-md"
                    content={
                      <>
                        <p>
                          Metadata attached to secrets will be added as resource tags to parameters
                          synced by Infisical.
                        </p>
                        <p className="mt-4">
                          Manually configured tags from the field above will take precedence over
                          secret metadata when tag keys conflict.
                        </p>
                      </>
                    }
                  >
                    <FontAwesomeIcon icon={faQuestionCircle} size="sm" className="ml-1" />
                  </Tooltip>
                </p>
              </Switch>
            </FormControl>
          )}
        />
      </TabPanel>
    </Tabs>
  );
};
