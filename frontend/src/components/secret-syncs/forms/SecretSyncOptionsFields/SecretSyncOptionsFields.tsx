import { ReactNode, useEffect } from "react";
import { Controller, useFormContext } from "react-hook-form";
import { faTriangleExclamation } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

import { FormControl, Select, SelectItem } from "@app/components/v2";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  Label,
  Switch
} from "@app/components/v3";
import { SECRET_SYNC_INITIAL_SYNC_BEHAVIOR_MAP, SECRET_SYNC_MAP } from "@app/helpers/secretSyncs";
import {
  SecretSync,
  SecretSyncInitialSyncBehavior,
  useSecretSyncOption
} from "@app/hooks/api/secretSyncs";

import { TSecretSyncForm } from "../schemas";
import { AwsParameterStoreSyncOptionsFields } from "./AwsParameterStoreSyncOptionsFields";
import { AwsSecretsManagerSyncOptionsFields } from "./AwsSecretsManagerSyncOptionsFields";
import { AzureKeyVaultSyncOptionsFields } from "./AzureKeyVaultSyncOptionsFields";
import { FlyioSyncOptionsFields } from "./FlyioSyncOptionsFields";
import { RenderSyncOptionsFields } from "./RenderSyncOptionsFields";
import { SecretSyncKeySchemaField } from "./SecretSyncKeySchemaField";

type Props = {
  hideInitialSync?: boolean;
  children?: ReactNode;
};

export const SecretSyncOptionsFields = ({ hideInitialSync, children }: Props) => {
  const { control, watch, setValue } = useFormContext<TSecretSyncForm>();

  const destination = watch("destination");
  const currentSyncOption = watch("syncOptions");
  const vercelSensitive =
    destination === SecretSync.Vercel
      ? Boolean(watch("destinationConfig.sensitive" as never))
      : false;

  const destinationName = SECRET_SYNC_MAP[destination].name;

  const { syncOption } = useSecretSyncOption(destination);

  // Vercel "sensitive" secrets cannot be read back, so importing destination secrets is impossible.
  // Force the initial sync behavior to OverwriteDestination whenever sensitive is enabled.
  useEffect(() => {
    if (
      vercelSensitive &&
      currentSyncOption.initialSyncBehavior !== SecretSyncInitialSyncBehavior.OverwriteDestination
    ) {
      setValue(
        "syncOptions.initialSyncBehavior",
        SecretSyncInitialSyncBehavior.OverwriteDestination
      );
    }
  }, [vercelSensitive, currentSyncOption.initialSyncBehavior, setValue]);

  const initialSyncBehaviorEntries = Object.entries(SECRET_SYNC_INITIAL_SYNC_BEHAVIOR_MAP).filter(
    ([key]) => !vercelSensitive || key === SecretSyncInitialSyncBehavior.OverwriteDestination
  );

  let AdditionalSyncOptionsFieldsComponent: ReactNode;

  switch (destination) {
    case SecretSync.AWSParameterStore:
      AdditionalSyncOptionsFieldsComponent = <AwsParameterStoreSyncOptionsFields />;
      break;
    case SecretSync.AWSSecretsManager:
      AdditionalSyncOptionsFieldsComponent = <AwsSecretsManagerSyncOptionsFields />;
      break;
    case SecretSync.Render:
      AdditionalSyncOptionsFieldsComponent = <RenderSyncOptionsFields />;
      break;
    case SecretSync.Flyio:
      AdditionalSyncOptionsFieldsComponent = <FlyioSyncOptionsFields />;
      break;
    case SecretSync.AzureKeyVault:
      AdditionalSyncOptionsFieldsComponent = <AzureKeyVaultSyncOptionsFields />;
      break;
    case SecretSync.GitHub:
    case SecretSync.GCPSecretManager:
    case SecretSync.AzureAppConfiguration:
    case SecretSync.AzureDevOps:
    case SecretSync.Databricks:
    case SecretSync.Humanitec:
    case SecretSync.TerraformCloud:
    case SecretSync.Camunda:
    case SecretSync.Vercel:
    case SecretSync.Windmill:
    case SecretSync.HCVault:
    case SecretSync.TeamCity:
    case SecretSync.OnePass:
    case SecretSync.OCIVault:
    case SecretSync.Heroku:
    case SecretSync.GitLab:
    case SecretSync.CloudflarePages:
    case SecretSync.CloudflareWorkers:
    case SecretSync.Zabbix:
    case SecretSync.Railway:
    case SecretSync.Checkly:
    case SecretSync.Supabase:
    case SecretSync.DigitalOceanAppPlatform:
    case SecretSync.Netlify:
    case SecretSync.Northflank:
    case SecretSync.Bitbucket:
    case SecretSync.LaravelForge:
    case SecretSync.Chef:
    case SecretSync.OctopusDeploy:
    case SecretSync.CircleCI:
    case SecretSync.AzureEntraIdScim:
    case SecretSync.ExternalInfisical:
    case SecretSync.OVH:
    case SecretSync.Devin:
    case SecretSync.Ona:
    case SecretSync.TravisCI:
    case SecretSync.Snowflake:
      AdditionalSyncOptionsFieldsComponent = null;
      break;
    default:
      throw new Error(`Unhandled Additional Sync Options Fields: ${destination}`);
  }

  return (
    <>
      {!hideInitialSync && (
        <>
          <Controller
            name="syncOptions.initialSyncBehavior"
            control={control}
            render={({ field: { value, onChange }, fieldState: { error } }) => (
              <FormControl
                tooltipClassName="max-w-lg py-3"
                tooltipText={
                  syncOption?.canImportSecrets ? (
                    <div className="flex flex-col gap-3">
                      <p>
                        Specify how Infisical should resolve the initial sync to {destinationName}.
                        The following options are available:
                      </p>
                      <ul className="flex list-disc flex-col gap-3 pl-4">
                        {Object.values(SECRET_SYNC_INITIAL_SYNC_BEHAVIOR_MAP).map((details) => {
                          const { name, description } = details(destinationName);

                          return (
                            <li key={name}>
                              <p className="text-mineshaft-300">
                                <span className="font-medium text-bunker-200">{name}</span>:{" "}
                                {description}
                              </p>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  ) : undefined
                }
                errorText={error?.message}
                isError={Boolean(error?.message)}
                label="Initial Sync Behavior"
              >
                <Select
                  isDisabled={!syncOption?.canImportSecrets || vercelSensitive}
                  value={value}
                  onValueChange={(val) => onChange(val)}
                  className="w-full border border-mineshaft-500"
                  position="popper"
                  placeholder="Select an option..."
                  dropdownContainerClassName="max-w-none"
                >
                  {initialSyncBehaviorEntries.map(([key, details]) => {
                    const { name } = details(destinationName);

                    return (
                      <SelectItem value={key} key={key}>
                        {name}
                      </SelectItem>
                    );
                  })}
                </Select>
              </FormControl>
            )}
          />
          {vercelSensitive && (
            <p className="-mt-2.5 mb-2.5 text-xs text-yellow">
              <FontAwesomeIcon className="mr-1" size="xs" icon={faTriangleExclamation} />
              When secrets are marked as sensitive, Vercel does not allow them to be read back, so
              only Overwrite Destination Secrets is supported.
            </p>
          )}
          {!vercelSensitive && !syncOption?.canImportSecrets && (
            <p className="-mt-2.5 mb-2.5 text-xs text-yellow">
              <FontAwesomeIcon className="mr-1" size="xs" icon={faTriangleExclamation} />
              {destinationName} only supports overwriting destination secrets.{" "}
              {!currentSyncOption.disableSecretDeletion &&
                (syncOption?.supportsKeySchema !== false ||
                  syncOption?.supportsDisableSecretDeletion !== false) &&
                `Secrets not present in Infisical will be removed from the destination. Consider adding a key schema or disabling secret deletion if you do not want existing secrets to be removed from ${destinationName}.`}
            </p>
          )}
          {!vercelSensitive &&
            syncOption?.canImportSecrets &&
            currentSyncOption.initialSyncBehavior ===
              SecretSyncInitialSyncBehavior.OverwriteDestination &&
            !currentSyncOption.disableSecretDeletion && (
              <p className="-mt-2.5 mb-2.5 text-xs text-yellow">
                <FontAwesomeIcon className="mr-1" size="xs" icon={faTriangleExclamation} />
                Secrets not present in Infisical will be removed from the destination. If you have
                secrets in {destinationName} that you do not want deleted, consider setting initial
                sync behavior to import destination secrets. Alternatively, configure a key schema
                or disable secret deletion below to have Infisical ignore these secrets.
              </p>
            )}
        </>
      )}
      {syncOption?.supportsKeySchema !== false && <SecretSyncKeySchemaField />}
      {syncOption?.supportsDisableSecretDeletion !== false && (
        <Controller
          control={control}
          name="syncOptions.disableSecretDeletion"
          render={({ field: { value, onChange }, fieldState: { error } }) => (
            <Field className="mb-4">
              <Field orientation="horizontal">
                <FieldContent>
                  <Label htmlFor="disable-secret-deletion">Disable secret deletion</Label>
                  <FieldDescription>
                    When enabled, Infisical will not remove secrets from {destinationName} during a
                    sync. Use this if you intend to manage some secrets manually outside of
                    Infisical.
                  </FieldDescription>
                </FieldContent>
                <Switch
                  id="disable-secret-deletion"
                  variant="project"
                  checked={value}
                  onCheckedChange={onChange}
                />
              </Field>
              <FieldError errors={[error]} />
            </Field>
          )}
        />
      )}
      {children}
      {AdditionalSyncOptionsFieldsComponent}
    </>
  );
};
