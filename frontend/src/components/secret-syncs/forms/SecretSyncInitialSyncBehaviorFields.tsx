import { useEffect } from "react";
import { Controller, useFormContext } from "react-hook-form";
import { TriangleAlert } from "lucide-react";

import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldLabel,
  FieldTitle,
  RadioGroup,
  RadioGroupItem
} from "@app/components/v3";
import { SECRET_SYNC_INITIAL_SYNC_BEHAVIOR_MAP, SECRET_SYNC_MAP } from "@app/helpers/secretSyncs";
import {
  SecretSync,
  SecretSyncInitialSyncBehavior,
  useSecretSyncOption
} from "@app/hooks/api/secretSyncs";

import { TSecretSyncForm } from "./schemas";

export const SecretSyncInitialSyncBehaviorFields = () => {
  const { control, watch, setValue } = useFormContext<TSecretSyncForm>();

  const destination = watch("destination");
  const destinationName = SECRET_SYNC_MAP[destination].name;
  const { syncOption } = useSecretSyncOption(destination);

  const vercelSensitive =
    destination === SecretSync.Vercel
      ? Boolean(watch("destinationConfig.sensitive" as never))
      : false;

  const currentInitialBehavior = watch("syncOptions.initialSyncBehavior");
  const disableSecretDeletion = watch("syncOptions.disableSecretDeletion");

  // Vercel "sensitive" secrets cannot be read back, so importing destination secrets is impossible.
  // Force the initial sync behavior to OverwriteDestination whenever sensitive is enabled.
  useEffect(() => {
    if (
      vercelSensitive &&
      currentInitialBehavior !== SecretSyncInitialSyncBehavior.OverwriteDestination
    ) {
      setValue(
        "syncOptions.initialSyncBehavior",
        SecretSyncInitialSyncBehavior.OverwriteDestination
      );
    }
  }, [vercelSensitive, currentInitialBehavior, setValue]);

  const behaviorEntries = Object.entries(SECRET_SYNC_INITIAL_SYNC_BEHAVIOR_MAP).filter(
    ([key]) => !vercelSensitive || key === SecretSyncInitialSyncBehavior.OverwriteDestination
  );

  const isDisabled = !syncOption?.canImportSecrets || vercelSensitive;

  return (
    <Controller
      control={control}
      name="syncOptions.initialSyncBehavior"
      render={({ field: { value, onChange }, fieldState: { error } }) => (
        <Field>
          <FieldLabel>Initial sync behavior</FieldLabel>
          <FieldDescription>
            Specify how Infisical should resolve the first sync to {destinationName}.
          </FieldDescription>
          <RadioGroup
            value={value}
            onValueChange={onChange}
            disabled={isDisabled}
            className="mt-3 gap-3"
          >
            {behaviorEntries.map(([key, details]) => {
              const { name, description } = details(destinationName);
              const id = `initial-sync-${key}`;
              return (
                <FieldLabel key={key} htmlFor={id} variant="project">
                  <Field orientation="horizontal">
                    <FieldContent>
                      <FieldTitle>{name}</FieldTitle>
                      <FieldDescription>{description}</FieldDescription>
                    </FieldContent>
                    <RadioGroupItem value={key} id={id} isError={Boolean(error)} />
                  </Field>
                </FieldLabel>
              );
            })}
          </RadioGroup>
          <FieldError errors={[error]} />
          {vercelSensitive && (
            <p className="flex items-start gap-1.5 text-xs text-warning">
              <TriangleAlert className="mt-0.5 size-3.5 shrink-0" />
              <span>
                When secrets are marked as sensitive, Vercel does not allow them to be read back, so
                only Overwrite Destination Secrets is supported.
              </span>
            </p>
          )}
          {!vercelSensitive && !syncOption?.canImportSecrets && (
            <p className="flex items-start gap-1.5 text-xs text-warning">
              <TriangleAlert className="mt-0.5 size-3.5 shrink-0" />
              <span>
                {destinationName} only supports overwriting destination secrets.
                {!disableSecretDeletion &&
                  (syncOption?.supportsKeySchema !== false ||
                    syncOption?.supportsDisableSecretDeletion !== false) &&
                  ` Secrets not present in Infisical will be removed from the destination. Consider adding a key schema or disabling secret deletion if you do not want existing secrets to be removed from ${destinationName}.`}
              </span>
            </p>
          )}
          {!vercelSensitive &&
            syncOption?.canImportSecrets &&
            value === SecretSyncInitialSyncBehavior.OverwriteDestination &&
            !disableSecretDeletion && (
              <p className="flex items-start gap-1.5 text-xs text-warning">
                <TriangleAlert className="mt-0.5 size-3.5 shrink-0" />
                <span>
                  Secrets not present in Infisical will be removed from the destination. If you have
                  secrets in {destinationName} that you do not want deleted, consider importing
                  destination secrets instead. Alternatively, configure a key schema or disable
                  secret deletion in the next step.
                </span>
              </p>
            )}
        </Field>
      )}
    />
  );
};
