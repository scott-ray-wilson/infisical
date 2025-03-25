import { useState } from "react";
import { Controller, useFormContext } from "react-hook-form";
import { addDays } from "date-fns";

import { DatePicker, FormControl, Input, Switch } from "@app/components/v2";

import { TSecretRotationV2Form } from "./schemas";
import { SecretRotationV2ConnectionField } from "./SecretRotationV2ConnectionField";

export const SecretRotationV2ConfigurationFields = () => {
  const { control, watch, setValue } = useFormContext<TSecretRotationV2Form>();
  const [showDatePicker, setShowDatePicker] = useState(false);

  const nextRotationAt = watch("nextRotationAt");

  return (
    <>
      <p className="mb-4 text-sm text-bunker-300">
        Configure the connection rotation strategy for this Secret Rotation.
      </p>
      <SecretRotationV2ConnectionField />
      <Controller
        render={({ field: { value, onChange }, fieldState: { error } }) => (
          <FormControl
            isError={Boolean(error)}
            errorText={error?.message}
            label="Rotation Interval (In Days)"
          >
            <Input
              value={value}
              type="number"
              onChange={(newValue) => {
                setValue(
                  "nextRotationAt",
                  addDays(nextRotationAt, Number(newValue.target.value) - value)
                );
                onChange(newValue);
              }}
              min={1}
              placeholder="my-secret-rotation"
            />
          </FormControl>
        )}
        control={control}
        name="rotationInterval"
      />
      <Controller
        render={({ field: { value, onChange }, fieldState: { error } }) => (
          <FormControl
            label="Schedule Next Rotation"
            isError={Boolean(error)}
            errorText={error?.message}
          >
            <DatePicker
              defaultMonth={value}
              value={value}
              onChange={onChange}
              popUpContentProps={{
                side: "right"
              }}
              popUpProps={{
                open: showDatePicker,
                onOpenChange: setShowDatePicker
              }}
            />
          </FormControl>
        )}
        control={control}
        name="nextRotationAt"
      />
      <Controller
        control={control}
        name="isAutoRotationEnabled"
        render={({ field: { value, onChange }, fieldState: { error } }) => {
          return (
            <FormControl
              helperText={
                value
                  ? "Secrets will automatically be rotated when the rotation interval specified above as elapsed."
                  : "Secrets will not be rotated automatically. You can still rotate secrets manually."
              }
              isError={Boolean(error)}
              errorText={error?.message}
            >
              <Switch
                className="bg-mineshaft-400/80 shadow-inner data-[state=checked]:bg-green/80"
                id="auto-rotation-enabled"
                thumbClassName="bg-mineshaft-800"
                onCheckedChange={onChange}
                isChecked={value}
              >
                <p className="w-[9.6rem]">Auto-Rotation {value ? "Enabled" : "Disabled"}</p>
              </Switch>
            </FormControl>
          );
        }}
      />
    </>
  );
};
