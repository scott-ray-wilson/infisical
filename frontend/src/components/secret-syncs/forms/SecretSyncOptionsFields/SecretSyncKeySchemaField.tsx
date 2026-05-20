import { useEffect, useState } from "react";
import { Controller, useFormContext, useFormState } from "react-hook-form";
import { ArrowRight } from "lucide-react";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
  Field,
  FieldDescription,
  FieldError,
  Input,
  Label
} from "@app/components/v3";
import { cn } from "@app/components/v3/utils";
import { SECRET_SYNC_MAP } from "@app/helpers/secretSyncs";

import { TSecretSyncForm } from "../schemas";

const SAMPLE_SECRET_KEY = "API_KEY";
const SAMPLE_ENVIRONMENT = "prod";

const applyKeySchema = (schema: string | undefined) => {
  if (!schema) return SAMPLE_SECRET_KEY;
  return schema
    .replaceAll("{{secretKey}}", SAMPLE_SECRET_KEY)
    .replaceAll("{{environment}}", SAMPLE_ENVIRONMENT);
};

type PreviewProps = {
  schema: string | undefined;
  destinationName: string;
};

const KeySchemaPreview = ({ schema, destinationName }: PreviewProps) => {
  const transformed = applyKeySchema(schema);

  return (
    <div className="grid grid-cols-[1fr_auto_1fr] items-end gap-3" aria-hidden="true">
      <div className="flex min-w-0 flex-col gap-1">
        <p className="text-[10px] font-medium tracking-wider text-muted uppercase">Infisical</p>
        <div className="flex items-center justify-between gap-2 rounded border border-border bg-mineshaft-800/80 px-2 py-1 text-[10px]">
          <span className="truncate font-mono text-foreground/80">{SAMPLE_SECRET_KEY}</span>
        </div>
      </div>
      <div className="flex items-center pb-1.5">
        <ArrowRight className="size-3 text-muted" strokeWidth={2.5} />
      </div>
      <div className="flex min-w-0 flex-col gap-1">
        <p className="truncate text-[10px] font-medium tracking-wider text-muted uppercase">
          {destinationName}
        </p>
        <div className="flex items-center justify-between gap-2 rounded border border-border bg-mineshaft-800/80 px-2 py-1 text-[10px]">
          <span className={cn("truncate font-mono text-foreground/80", schema && "text-info")}>
            {transformed || SAMPLE_SECRET_KEY}
          </span>
        </div>
      </div>
    </div>
  );
};

const ITEM_VALUE = "key-schema";

export const SecretSyncKeySchemaField = () => {
  const { control, watch } = useFormContext<TSecretSyncForm>();
  const destination = watch("destination");
  const destinationName = SECRET_SYNC_MAP[destination].name;
  const currentValue = watch("syncOptions.keySchema");

  const { errors, submitCount } = useFormState({ control });
  const hasSchemaError = Boolean(
    (errors.syncOptions as { keySchema?: unknown } | undefined)?.keySchema
  );

  const [openItem, setOpenItem] = useState<string>(
    currentValue || hasSchemaError ? ITEM_VALUE : ""
  );

  useEffect(() => {
    if (hasSchemaError) setOpenItem(ITEM_VALUE);
  }, [hasSchemaError, submitCount]);

  return (
    <Controller
      control={control}
      name="syncOptions.keySchema"
      render={({ field: { value, onChange }, fieldState: { error } }) => (
        <Accordion
          type="single"
          collapsible
          value={openItem}
          onValueChange={setOpenItem}
          className="mt-auto bg-card"
        >
          <AccordionItem value={ITEM_VALUE}>
            <AccordionTrigger className="">
              <div className="flex w-0 flex-1 items-center justify-between gap-3">
                <span className="text-sm font-medium text-foreground">Customize key names</span>
                <span className="truncate text-xs text-muted">
                  {value ? (
                    <code className="rounded bg-mineshaft-800/80 px-1 py-0.5 font-mono text-[11px] text-foreground/80">
                      {value}
                    </code>
                  ) : (
                    "Using default — keys keep their Infisical names"
                  )}
                </span>
              </div>
            </AccordionTrigger>
            <AccordionContent>
              <Field>
                <Label htmlFor="sync-key-schema">Key schema</Label>
                <FieldDescription>
                  By default, keys keep their Infisical names when written to {destinationName}.
                  Provide a template to rewrite each key — use{" "}
                  <code className="rounded bg-mineshaft-800/80 px-1 py-0.5 font-mono text-[11px] text-foreground/80">
                    {"{{secretKey}}"}
                  </code>{" "}
                  as a placeholder, and optionally include{" "}
                  <code className="rounded bg-mineshaft-800/80 px-1 py-0.5 font-mono text-[11px] text-foreground/80">
                    {"{{environment}}"}
                  </code>
                  .{" "}
                  <a
                    href="https://infisical.com/docs/integrations/secret-syncs/overview#key-schemas"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Learn more
                  </a>
                  .
                </FieldDescription>
                <Input
                  id="sync-key-schema"
                  value={value ?? ""}
                  onChange={onChange}
                  placeholder="INFISICAL_{{secretKey}}"
                  isError={Boolean(error)}
                />
                <KeySchemaPreview schema={value} destinationName={destinationName} />
                <FieldError errors={[error]} />
              </Field>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      )}
    />
  );
};
