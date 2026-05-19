import { useState } from "react";
import { Controller, useFormContext } from "react-hook-form";
import { ArrowRight } from "lucide-react";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
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
    <div
      className="mt-3 grid grid-cols-[1fr_auto_1fr] items-start gap-3 rounded-md border border-border bg-card p-3"
      aria-hidden="true"
    >
      <div className="flex min-w-0 flex-col gap-1.5">
        <p className="text-[10px] font-medium tracking-wider text-muted uppercase">Infisical</p>
        <div className="flex items-center justify-between gap-2 rounded border border-border bg-mineshaft-800/80 px-2 py-1 text-[10px]">
          <span className="truncate font-mono text-foreground/80">{SAMPLE_SECRET_KEY}</span>
        </div>
      </div>
      <div className="my-auto flex items-center pt-5">
        <ArrowRight className="size-4 text-muted" strokeWidth={2.5} />
      </div>
      <div className="flex min-w-0 flex-col gap-1.5">
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

  const [openItem, setOpenItem] = useState<string>(currentValue ? ITEM_VALUE : "");

  return (
    <Controller
      control={control}
      name="syncOptions.keySchema"
      render={({ field: { value, onChange }, fieldState: { error } }) => (
        <div className="mb-4 flex flex-col gap-1.5">
          <p className="text-[11px] font-medium tracking-wider text-muted uppercase">Key Naming</p>
          <Accordion type="single" collapsible value={openItem} onValueChange={setOpenItem}>
            <AccordionItem value={ITEM_VALUE}>
              <AccordionTrigger>
                <div className="flex w-0 flex-1 items-center justify-between gap-3">
                  <span className="text-sm font-medium text-foreground">Custom key naming</span>
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
              <AccordionContent className="flex flex-col gap-4">
                <FieldDescription>
                  By default, keys use the same names as your Infisical secrets — e.g.{" "}
                  <code className="rounded bg-mineshaft-800/80 px-1 py-0.5 font-mono text-[11px] text-foreground/80">
                    API_KEY
                  </code>{" "}
                  stays{" "}
                  <code className="rounded bg-mineshaft-800/80 px-1 py-0.5 font-mono text-[11px] text-foreground/80">
                    API_KEY
                  </code>
                  . Provide a template to rewrite each key before it&apos;s written to{" "}
                  {destinationName}.
                </FieldDescription>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="sync-key-schema" className="text-xs text-accent">
                    Key schema
                  </Label>
                  <Input
                    id="sync-key-schema"
                    value={value ?? ""}
                    onChange={onChange}
                    placeholder="INFISICAL_{{secretKey}}"
                    isError={Boolean(error)}
                  />
                  <FieldDescription>
                    Use <code className="font-mono">{"{{secretKey}}"}</code> as a placeholder.
                    Optionally include <code className="font-mono">{"{{environment}}"}</code>.{" "}
                    <a
                      href="https://infisical.com/docs/integrations/secret-syncs/overview#key-schemas"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Learn more
                    </a>
                    .
                  </FieldDescription>
                  <KeySchemaPreview schema={value} destinationName={destinationName} />
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
          <FieldError errors={[error]} />
        </div>
      )}
    />
  );
};
