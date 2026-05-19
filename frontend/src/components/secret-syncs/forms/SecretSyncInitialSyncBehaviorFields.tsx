import { useEffect } from "react";
import { Controller, useFormContext } from "react-hook-form";
import { ArrowLeftRight, ArrowRight, TriangleAlert } from "lucide-react";

import {
  Alert,
  AlertDescription,
  AlertTitle,
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldLabel,
  FieldTitle,
  RadioGroup,
  RadioGroupItem
} from "@app/components/v3";
import { cn } from "@app/components/v3/utils";
import { SECRET_SYNC_MAP } from "@app/helpers/secretSyncs";
import {
  SecretSync,
  SecretSyncInitialSyncBehavior,
  useSecretSyncOption
} from "@app/hooks/api/secretSyncs";

import { TSecretSyncForm } from "./schemas";

type GraphicVariant = "overwrite" | "prioritize-infisical" | "prioritize-destination";

const getGraphicVariant = (key: string): GraphicVariant => {
  if (key === SecretSyncInitialSyncBehavior.OverwriteDestination) return "overwrite";
  if (key === SecretSyncInitialSyncBehavior.ImportPrioritizeSource) return "prioritize-infisical";
  return "prioritize-destination";
};

const getShortDestinationName = (name: string) => name.split(" ")[0];

const getBehaviorCopy = (
  key: SecretSyncInitialSyncBehavior,
  destinationName: string
): { title: string; description: string } => {
  const shortName = getShortDestinationName(destinationName);
  switch (key) {
    case SecretSyncInitialSyncBehavior.OverwriteDestination:
      return {
        title: `Replace everything in ${destinationName}`,
        description:
          "Infisical becomes the source of truth. Any secrets in the destination path that aren't in Infisical will be deleted."
      };
    case SecretSyncInitialSyncBehavior.ImportPrioritizeSource:
      return {
        title: "Merge — Infisical wins on conflicts",
        description: `Pull existing secrets from ${shortName} into Infisical. If the same key exists in both, the value from Infisical is kept and pushed to ${shortName}.`
      };
    case SecretSyncInitialSyncBehavior.ImportPrioritizeDestination:
    default:
      return {
        title: `Merge — ${shortName} wins on conflicts`,
        description: `Pull existing secrets from ${shortName} into Infisical. If the same key exists in both, the value from ${shortName} is kept and Infisical is updated.`
      };
  }
};

type SecretFate = "kept" | "added" | "removed" | "updated" | "imported";

type ReconciliationRow = { name: string; fate?: SecretFate };

const fateLabel: Record<Exclude<SecretFate, "kept">, string> = {
  added: "added",
  removed: "removed",
  updated: "updated",
  imported: "imported"
};

const fateClass: Record<Exclude<SecretFate, "kept">, string> = {
  added: "text-success",
  removed: "text-danger",
  updated: "text-warning",
  imported: "text-info"
};

const SecretRow = ({ name, fate }: ReconciliationRow) => {
  const isRemoved = fate === "removed";
  return (
    <div
      className={cn(
        "flex items-center justify-between gap-2 rounded border px-2 py-1 text-[10px]",
        isRemoved ? "border-danger/20 bg-danger/5" : "border-border bg-mineshaft-800/80"
      )}
    >
      <span
        className={cn(
          "truncate font-mono text-foreground/80",
          isRemoved && "text-danger/70 line-through"
        )}
      >
        {name}
      </span>
      {fate && fate !== "kept" && (
        <span className={cn("shrink-0 text-[9px] tracking-wider uppercase", fateClass[fate])}>
          {fateLabel[fate]}
        </span>
      )}
    </div>
  );
};

const ReconciliationDiagram = ({
  variant,
  destinationName
}: {
  variant: GraphicVariant;
  destinationName: string;
}) => {
  let infisicalRows: ReconciliationRow[];
  let destinationRows: ReconciliationRow[];
  let arrowIcon: React.ReactNode;

  switch (variant) {
    case "overwrite":
      infisicalRows = [{ name: "API_KEY" }, { name: "DB_URL" }];
      destinationRows = [
        { name: "API_KEY", fate: "updated" },
        { name: "DB_URL", fate: "added" },
        { name: "LEGACY_TOKEN", fate: "removed" }
      ];
      arrowIcon = <ArrowRight className="size-4 text-muted" strokeWidth={2.5} />;
      break;
    case "prioritize-infisical":
      infisicalRows = [
        { name: "API_KEY" },
        { name: "DB_URL" },
        { name: "LEGACY_TOKEN", fate: "imported" }
      ];
      destinationRows = [
        { name: "API_KEY", fate: "updated" },
        { name: "DB_URL", fate: "added" },
        { name: "LEGACY_TOKEN" }
      ];
      arrowIcon = <ArrowLeftRight className="size-4 text-muted" strokeWidth={2.5} />;
      break;
    case "prioritize-destination":
    default:
      infisicalRows = [
        { name: "API_KEY", fate: "updated" },
        { name: "DB_URL" },
        { name: "LEGACY_TOKEN", fate: "imported" }
      ];
      destinationRows = [
        { name: "API_KEY" },
        { name: "DB_URL", fate: "added" },
        { name: "LEGACY_TOKEN" }
      ];
      arrowIcon = <ArrowLeftRight className="size-4 text-muted" strokeWidth={2.5} />;
      break;
  }

  return (
    <div
      className="mt-2 grid grid-cols-[1fr_auto_1fr] items-start gap-3 rounded-md border border-border bg-card p-3"
      aria-hidden="true"
    >
      <div className="flex min-w-0 flex-col gap-1.5">
        <p className="text-[10px] font-medium tracking-wider text-muted uppercase">Infisical</p>
        <div className="flex flex-col gap-1">
          {infisicalRows.map((row) => (
            <SecretRow key={row.name} {...row} />
          ))}
        </div>
      </div>
      <div className="my-auto flex items-center pt-5">{arrowIcon}</div>
      <div className="flex min-w-0 flex-col gap-1.5">
        <p className="truncate text-[10px] font-medium tracking-wider text-muted uppercase">
          {destinationName}
        </p>
        <div className="flex flex-col gap-1">
          {destinationRows.map((row) => (
            <SecretRow key={row.name} {...row} />
          ))}
        </div>
      </div>
    </div>
  );
};

const BEHAVIOR_ORDER: SecretSyncInitialSyncBehavior[] = [
  SecretSyncInitialSyncBehavior.OverwriteDestination,
  SecretSyncInitialSyncBehavior.ImportPrioritizeSource,
  SecretSyncInitialSyncBehavior.ImportPrioritizeDestination
];

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

  const behaviorKeys = BEHAVIOR_ORDER.filter(
    (key) => !vercelSensitive || key === SecretSyncInitialSyncBehavior.OverwriteDestination
  );

  const isDisabled = !syncOption?.canImportSecrets || vercelSensitive;

  return (
    <Controller
      control={control}
      name="syncOptions.initialSyncBehavior"
      render={({ field: { value, onChange }, fieldState: { error } }) => (
        <Field>
          {vercelSensitive && (
            <Alert className="mb-2" variant="warning">
              <TriangleAlert />
              <AlertTitle>Only overwrite is supported for sensitive secrets</AlertTitle>
              <AlertDescription>
                When secrets are marked as sensitive, Vercel does not allow them to be read back, so
                only Overwrite Destination Secrets is supported.
              </AlertDescription>
            </Alert>
          )}
          {!vercelSensitive && !syncOption?.canImportSecrets && (
            <Alert className="mb-2" variant="warning">
              <TriangleAlert />
              <AlertTitle>{destinationName} only supports overwriting</AlertTitle>
              <AlertDescription>
                {destinationName} only supports overwriting destination secrets.
                {!disableSecretDeletion &&
                  (syncOption?.supportsKeySchema !== false ||
                    syncOption?.supportsDisableSecretDeletion !== false) &&
                  ` Secrets not present in Infisical will be removed from the destination. Consider adding a key schema or disabling secret deletion if you do not want existing secrets to be removed from ${destinationName}.`}
              </AlertDescription>
            </Alert>
          )}
          {!vercelSensitive &&
            syncOption?.canImportSecrets &&
            value === SecretSyncInitialSyncBehavior.OverwriteDestination &&
            !disableSecretDeletion && (
              <Alert className="mb-2" variant="warning">
                <TriangleAlert />
                <AlertTitle>Existing destination secrets will be deleted</AlertTitle>
                <AlertDescription>
                  Secrets not present in Infisical will be removed from the destination. If you have
                  secrets in {destinationName} that you do not want deleted, consider importing
                  destination secrets instead. Alternatively, configure a key schema or disable
                  secret deletion in the next step.
                </AlertDescription>
              </Alert>
            )}
          <RadioGroup
            value={value}
            onValueChange={onChange}
            disabled={isDisabled}
            className="gap-3"
          >
            {behaviorKeys.map((key) => {
              const { title, description } = getBehaviorCopy(key, destinationName);
              const id = `initial-sync-${key}`;
              return (
                <FieldLabel key={key} htmlFor={id} variant="project">
                  <Field orientation="horizontal">
                    <FieldContent>
                      <FieldTitle>{title}</FieldTitle>
                      <FieldDescription className="text-wrap!">{description}</FieldDescription>
                      <ReconciliationDiagram
                        variant={getGraphicVariant(key)}
                        destinationName={destinationName}
                      />
                    </FieldContent>
                    <RadioGroupItem value={key} id={id} isError={Boolean(error)} />
                  </Field>
                </FieldLabel>
              );
            })}
          </RadioGroup>
          <FieldError errors={[error]} />
        </Field>
      )}
    />
  );
};
