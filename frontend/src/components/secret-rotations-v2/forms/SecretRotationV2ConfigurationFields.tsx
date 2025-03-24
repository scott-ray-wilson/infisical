import { useState } from "react";
import { Controller, useFormContext } from "react-hook-form";
import { addDays } from "date-fns";

import { DatePicker, FormControl, Input, Switch } from "@app/components/v2";

import { TSecretRotationV2Form } from "./schemas";
import { SecretRotationV2ConnectionField } from "./SecretRotationV2ConnectionField";

export const SecretRotationV2ConfigurationFields = () => {
  const { control, watch } = useFormContext<TSecretRotationV2Form>();
  const [open, setOpen] = useState(false);
  const [datetime, setDateTime] = useState<Date | undefined>(new Date());

  const interval = watch("interval");

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
              onChange={onChange}
              min={1}
              placeholder="my-secret-rotation"
            />
          </FormControl>
        )}
        control={control}
        name="interval"
      />
      <FormControl label="Schedule Next Rotation">
        <DatePicker
          value={addDays(datetime, Number(interval))}
          onChange={(date) => setDateTime(date)}
          popUpContentProps={{
            side: "right"
          }}
          popUpProps={{
            open,
            onOpenChange: setOpen
          }}
        />
      </FormControl>
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
