import { Controller, useFormContext } from "react-hook-form";
import { components, OptionProps } from "react-select";
import { faCheckCircle } from "@fortawesome/free-regular-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

import { Badge, FilterableSelect, FormControl, Input } from "@app/components/v2";
import { AWS_REGIONS } from "@app/helpers/appConnections";

import { TSecretSyncForm } from "../schemas";

const Option = ({ isSelected, children, ...props }: OptionProps<(typeof AWS_REGIONS)[number]>) => {
  return (
    <components.Option isSelected={isSelected} {...props}>
      <div className="flex flex-row items-center justify-between">
        <p className="truncate">{children}</p>
        <Badge variant="success" className="mr-auto ml-1 cursor-pointer">
          {props.data.slug}
        </Badge>
        {isSelected && (
          <FontAwesomeIcon className="ml-2 text-primary" icon={faCheckCircle} size="sm" />
        )}
      </div>
    </components.Option>
  );
};

export const AwsParameterStoreConfigFields = () => {
  const { control } = useFormContext<TSecretSyncForm>();

  return (
    <>
      <Controller
        render={({ field: { value, onChange }, fieldState: { error } }) => (
          <FormControl isError={Boolean(error)} errorText={error?.message} label="Region">
            <FilterableSelect
              value={value}
              onChange={onChange}
              options={AWS_REGIONS}
              placeholder="Select region..."
              getOptionLabel={(option) => option.name}
              getOptionValue={(option) => option.slug}
              components={{ Option }}
            />
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
    </>
  );
};
