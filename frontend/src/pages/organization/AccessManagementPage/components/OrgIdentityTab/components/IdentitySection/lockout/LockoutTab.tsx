import { Control, Controller } from "react-hook-form";
import { InfoIcon } from "lucide-react";

import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Switch,
  TabsContent,
  Tooltip,
  TooltipContent,
  TooltipTrigger
} from "@app/components/v3";

import { IdentityFormTab } from "../types";

export const LockoutTab = ({
  control,
  lockoutEnabled,
  lockoutThreshold,
  lockoutDurationValue,
  lockoutDurationUnit,
  lockoutCounterResetValue,
  lockoutCounterResetUnit
}: {
  control: Control<any>;
  lockoutEnabled: boolean;
  lockoutThreshold: string;
  lockoutDurationValue: string;
  lockoutDurationUnit: "s" | "m" | "h" | "d";
  lockoutCounterResetValue: string;
  lockoutCounterResetUnit: "s" | "m" | "h";
}) => {
  return (
    <TabsContent value={IdentityFormTab.Lockout}>
      <FieldGroup>
        <Controller
          control={control}
          name="lockoutEnabled"
          render={({ field: { value, onChange }, fieldState: { error } }) => {
            return (
              <Field>
                <div className="flex items-center gap-2">
                  <Switch id="lockout-enabled" checked={value} onCheckedChange={onChange} />
                  <FieldLabel htmlFor="lockout-enabled" className="mb-0">
                    Lockout
                  </FieldLabel>
                </div>
                <FieldDescription>
                  {`The lockout feature will prevent login attempts for ${lockoutDurationValue}${lockoutDurationUnit} after ${lockoutThreshold} consecutive login failures. If ${lockoutCounterResetValue}${lockoutCounterResetUnit} pass after the most recent failure, the lockout counter resets.`}
                </FieldDescription>
                <FieldError>{error?.message}</FieldError>
              </Field>
            );
          }}
        />
        <Controller
          control={control}
          name="lockoutThreshold"
          render={({ field, fieldState: { error } }) => {
            return (
              <Field className={lockoutEnabled ? "" : "opacity-70"}>
                <FieldLabel htmlFor="lockoutThreshold" className="inline-flex items-center gap-1.5">
                  Lockout Threshold
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <InfoIcon className="size-3.5 text-muted" />
                    </TooltipTrigger>
                    <TooltipContent>
                      The amount of times login must fail before locking the identity auth method
                    </TooltipContent>
                  </Tooltip>
                </FieldLabel>
                <Input
                  {...field}
                  id="lockoutThreshold"
                  placeholder="Enter lockout threshold..."
                  disabled={!lockoutEnabled}
                  isError={Boolean(error)}
                />
                <FieldError>{error?.message}</FieldError>
              </Field>
            );
          }}
        />
        <div className="flex items-start gap-2">
          <Controller
            control={control}
            name="lockoutDurationValue"
            render={({ field, fieldState: { error } }) => {
              return (
                <Field className={`flex-1 ${lockoutEnabled ? "" : "opacity-70"}`}>
                  <FieldLabel
                    htmlFor="lockoutDurationValue"
                    className="inline-flex items-center gap-1.5"
                  >
                    Lockout Duration
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <InfoIcon className="size-3.5 text-muted" />
                      </TooltipTrigger>
                      <TooltipContent>
                        How long an identity auth method lockout lasts
                      </TooltipContent>
                    </Tooltip>
                  </FieldLabel>
                  <Input
                    {...field}
                    id="lockoutDurationValue"
                    placeholder="Enter lockout duration..."
                    disabled={!lockoutEnabled}
                    isError={Boolean(error)}
                  />
                  <FieldError>{error?.message}</FieldError>
                </Field>
              );
            }}
          />
          <Controller
            control={control}
            name="lockoutDurationUnit"
            render={({ field, fieldState: { error } }) => (
              <Field className={lockoutEnabled ? "" : "opacity-70"}>
                <FieldLabel htmlFor="lockoutDurationUnit" className="invisible">
                  Unit
                </FieldLabel>
                <Select
                  disabled={!lockoutEnabled}
                  value={field.value}
                  onValueChange={field.onChange}
                >
                  <SelectTrigger
                    id="lockoutDurationUnit"
                    className="min-w-32"
                    isError={Boolean(error)}
                  >
                    <SelectValue placeholder="Select unit" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="s">Seconds</SelectItem>
                    <SelectItem value="m">Minutes</SelectItem>
                    <SelectItem value="h">Hours</SelectItem>
                    <SelectItem value="d">Days</SelectItem>
                  </SelectContent>
                </Select>
                <FieldError>{error?.message}</FieldError>
              </Field>
            )}
          />
        </div>
        <div className="flex items-start gap-2">
          <Controller
            control={control}
            name="lockoutCounterResetValue"
            render={({ field, fieldState: { error } }) => {
              return (
                <Field className={`flex-1 ${lockoutEnabled ? "" : "opacity-70"}`}>
                  <FieldLabel
                    htmlFor="lockoutCounterResetValue"
                    className="inline-flex items-center gap-1.5"
                  >
                    Lockout Counter Reset
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <InfoIcon className="size-3.5 text-muted" />
                      </TooltipTrigger>
                      <TooltipContent>
                        How long to wait from the most recent failed login until resetting the
                        lockout counter
                      </TooltipContent>
                    </Tooltip>
                  </FieldLabel>
                  <Input
                    {...field}
                    id="lockoutCounterResetValue"
                    placeholder="Enter lockout counter reset..."
                    disabled={!lockoutEnabled}
                    isError={Boolean(error)}
                  />
                  <FieldError>{error?.message}</FieldError>
                </Field>
              );
            }}
          />
          <Controller
            control={control}
            name="lockoutCounterResetUnit"
            render={({ field, fieldState: { error } }) => (
              <Field className={lockoutEnabled ? "" : "opacity-70"}>
                <FieldLabel htmlFor="lockoutCounterResetUnit" className="invisible">
                  Unit
                </FieldLabel>
                <Select
                  disabled={!lockoutEnabled}
                  value={field.value}
                  onValueChange={field.onChange}
                >
                  <SelectTrigger
                    id="lockoutCounterResetUnit"
                    className="min-w-32"
                    isError={Boolean(error)}
                  >
                    <SelectValue placeholder="Select unit" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="s">Seconds</SelectItem>
                    <SelectItem value="m">Minutes</SelectItem>
                    <SelectItem value="h">Hours</SelectItem>
                  </SelectContent>
                </Select>
                <FieldError>{error?.message}</FieldError>
              </Field>
            )}
          />
        </div>
      </FieldGroup>
    </TabsContent>
  );
};
