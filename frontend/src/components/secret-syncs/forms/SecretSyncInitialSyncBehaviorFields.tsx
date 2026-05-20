import { useEffect } from "react";
import { Controller, useFormContext } from "react-hook-form";
import { ArrowDown, TriangleAlert } from "lucide-react";

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

const fateConfig: Record<
  Exclude<SecretFate, "kept">,
  { label: string; badgeClass: string; wrapperClass: string }
> = {
  added: {
    label: "added",
    badgeClass: "text-success",
    wrapperClass: "border-dashed border-success/50 bg-success/5"
  },
  updated: {
    label: "updated",
    badgeClass: "text-warning",
    wrapperClass: "border-warning/40 bg-warning/5"
  },
  imported: {
    label: "imported",
    badgeClass: "text-info",
    wrapperClass: "border-dashed border-info/50 bg-info/5"
  },
  removed: {
    label: "removed",
    badgeClass: "text-danger",
    wrapperClass: "border-dashed border-danger/40 bg-danger/5"
  }
};

const SecretRow = ({ name, fate }: ReconciliationRow) => {
  const config = fate && fate !== "kept" ? fateConfig[fate] : null;
  const isRemoved = fate === "removed";
  return (
    <div
      className={cn(
        "flex items-center justify-between gap-2 rounded border px-2 py-1 text-[10px]",
        config ? config.wrapperClass : "border-border bg-mineshaft-800/80"
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
      {config && (
        <span className={cn("shrink-0 text-[9px] tracking-wider uppercase", config.badgeClass)}>
          {config.label}
        </span>
      )}
    </div>
  );
};

const ReconciliationLegend = () => (
  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[9px] tracking-wider text-muted uppercase">
    <span className="flex items-center gap-1">
      <span className="inline-block h-2 w-3 rounded-[2px] border border-border bg-mineshaft-800/80" />
      unchanged
    </span>
    <span className="flex items-center gap-1">
      <span className="inline-block h-2 w-3 rounded-[2px] border border-warning/40 bg-warning/5" />
      value updated
    </span>
    <span className="flex items-center gap-1">
      <span className="inline-block h-2 w-3 rounded-[2px] border border-dashed border-success/50 bg-success/5" />
      added
    </span>
    <span className="flex items-center gap-1">
      <span className="inline-block h-2 w-3 rounded-[2px] border border-dashed border-info/50 bg-info/5" />
      imported
    </span>
    <span className="flex items-center gap-1">
      <span className="inline-block h-2 w-3 rounded-[2px] border border-dashed border-danger/40 bg-danger/5" />
      removed
    </span>
  </div>
);

const BEFORE_INFISICAL: ReconciliationRow[] = [{ name: "API_KEY" }, { name: "DB_URL" }];
const BEFORE_DESTINATION: ReconciliationRow[] = [
  { name: "API_KEY" },
  { name: "LEGACY_TOKEN" }
];

const getAfterRows = (
  variant: GraphicVariant
): { infisical: ReconciliationRow[]; destination: ReconciliationRow[] } => {
  switch (variant) {
    case "overwrite":
      return {
        infisical: [{ name: "API_KEY" }, { name: "DB_URL" }],
        destination: [
          { name: "API_KEY", fate: "updated" },
          { name: "DB_URL", fate: "added" },
          { name: "LEGACY_TOKEN", fate: "removed" }
        ]
      };
    case "prioritize-infisical":
      return {
        infisical: [
          { name: "API_KEY" },
          { name: "DB_URL" },
          { name: "LEGACY_TOKEN", fate: "imported" }
        ],
        destination: [
          { name: "API_KEY", fate: "updated" },
          { name: "DB_URL", fate: "added" },
          { name: "LEGACY_TOKEN" }
        ]
      };
    case "prioritize-destination":
    default:
      return {
        infisical: [
          { name: "API_KEY", fate: "updated" },
          { name: "DB_URL" },
          { name: "LEGACY_TOKEN", fate: "imported" }
        ],
        destination: [
          { name: "API_KEY" },
          { name: "DB_URL", fate: "added" },
          { name: "LEGACY_TOKEN" }
        ]
      };
  }
};

const ReconciliationSection = ({
  title,
  subtitle,
  destinationName,
  infisicalRows,
  destinationRows
}: {
  title: string;
  subtitle: string;
  destinationName: string;
  infisicalRows: ReconciliationRow[];
  destinationRows: ReconciliationRow[];
}) => (
  <div className="rounded-md border border-border bg-mineshaft-800/30 p-3">
    <div className="mb-3 flex items-baseline gap-2">
      <p className="text-xs font-semibold tracking-wider text-foreground uppercase">{title}</p>
      <p className="text-xs text-muted">{subtitle}</p>
    </div>
    <div className="grid grid-cols-2 items-start gap-3">
      <div className="flex min-w-0 flex-col gap-1.5">
        <p className="truncate text-[10px] font-medium tracking-wider text-muted uppercase">
          Infisical
        </p>
        <div className="flex flex-col gap-1">
          {infisicalRows.map((row) => (
            <SecretRow key={row.name} {...row} />
          ))}
        </div>
      </div>
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
  </div>
);

const ReconciliationDiagram = ({
  variant,
  destinationName
}: {
  variant: GraphicVariant;
  destinationName: string;
}) => {
  const after = getAfterRows(variant);

  return (
    <div className="mt-2 flex flex-col gap-2" aria-hidden="true">
      <ReconciliationSection
        title="Before"
        subtitle="What exists on each side today"
        destinationName={destinationName}
        infisicalRows={BEFORE_INFISICAL}
        destinationRows={BEFORE_DESTINATION}
      />
      <div className="flex items-center gap-3 px-1">
        <div className="h-px flex-1 bg-border" />
        <div className="flex items-center gap-1.5 text-[10px] font-medium tracking-wider text-muted uppercase">
          <ArrowDown className="size-3" strokeWidth={2.5} />
          First sync runs
        </div>
        <div className="h-px flex-1 bg-border" />
      </div>
      <ReconciliationSection
        title="After"
        subtitle="Final state once the sync completes"
        destinationName={destinationName}
        infisicalRows={after.infisical}
        destinationRows={after.destination}
      />
      <div className="mt-1 px-1">
        <ReconciliationLegend />
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
                    </FieldContent>
                    <RadioGroupItem value={key} id={id} isError={Boolean(error)} />
                  </Field>
                </FieldLabel>
              );
            })}
          </RadioGroup>
          {value && (
            <div className="mt-4">
              <p className="mb-2 text-[11px] font-medium tracking-wider text-muted uppercase">
                Example
              </p>
              <ReconciliationDiagram
                variant={getGraphicVariant(value)}
                destinationName={destinationName}
              />
            </div>
          )}
          {vercelSensitive && (
            <Alert className="mt-4" variant="warning">
              <TriangleAlert />
              <AlertTitle>Only overwrite is supported for sensitive secrets</AlertTitle>
              <AlertDescription>
                When secrets are marked as sensitive, Vercel does not allow them to be read back, so
                only Overwrite Destination Secrets is supported.
              </AlertDescription>
            </Alert>
          )}
          {!vercelSensitive && !syncOption?.canImportSecrets && (
            <Alert className="mt-4" variant="warning">
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
              <Alert className="mt-4" variant="warning">
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
          <FieldError errors={[error]} />
        </Field>
      )}
    />
  );
};
