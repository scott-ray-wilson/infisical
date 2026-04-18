import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowRight, Loader2 } from "lucide-react";
import { twMerge } from "tailwind-merge";
import { z } from "zod";

import {
  Button,
  Field,
  FieldError,
  FieldLabel,
  IconButton,
  Input
} from "@app/components/v3";

import { BrandingTheme } from "../ViewSharedSecretByIDPage";

type Props = {
  onPasswordSubmit: (val: any) => void;
  isSubmitting?: boolean;
  isInvalidCredential?: boolean;
  brandingTheme?: BrandingTheme;
};

const formSchema = z.object({
  password: z.string()
});

export type FormData = z.infer<typeof formSchema>;

export const PasswordContainer = ({
  onPasswordSubmit,
  isSubmitting,
  isInvalidCredential,
  brandingTheme
}: Props) => {
  const { control, handleSubmit } = useForm<FormData>({
    resolver: zodResolver(formSchema)
  });

  const onFormSubmit = async ({ password }: FormData) => {
    onPasswordSubmit(password);
  };

  const panelStyle = brandingTheme
    ? {
        backgroundColor: brandingTheme.panelBg,
        borderColor: brandingTheme.panelBorder
      }
    : undefined;

  const inputStyle = brandingTheme
    ? ({
        backgroundColor: brandingTheme.inputBg,
        color: brandingTheme.textColor,
        "--muted-color": brandingTheme.textMutedColor,
        borderColor: brandingTheme.panelBorder
      } as React.CSSProperties)
    : undefined;

  return (
    <div
      className={twMerge("rounded-lg border p-4", !brandingTheme && "border-border bg-card")}
      style={panelStyle}
    >
      <form onSubmit={handleSubmit(onFormSubmit)}>
        <Controller
          control={control}
          name="password"
          defaultValue=""
          render={({ field, fieldState: { error } }) => (
            <Field style={brandingTheme ? { color: brandingTheme.textColor } : undefined}>
              <FieldLabel
                className={brandingTheme ? "text-[var(--muted-color)]" : ""}
                style={brandingTheme ? ({ "--muted-color": brandingTheme.textMutedColor } as React.CSSProperties) : undefined}
              >
                Password
              </FieldLabel>
              <div className="flex items-center gap-2">
                <Input
                  {...field}
                  placeholder="Enter password to view secret"
                  type="password"
                  style={inputStyle}
                  className={twMerge(
                    "flex-1",
                    brandingTheme &&
                      "border placeholder-[var(--muted-color)]/70 focus-visible:ring-[var(--muted-color)]/50"
                  )}
                  isError={Boolean(error) || isInvalidCredential}
                />
                <IconButton
                  aria-label="submit password"
                  variant="outline"
                  onClick={handleSubmit(onFormSubmit)}
                  style={inputStyle}
                >
                  {isSubmitting ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <ArrowRight className="size-4" />
                  )}
                </IconButton>
              </div>
              {(error || isInvalidCredential) && (
                <FieldError>{isInvalidCredential ? "Invalid credential" : error?.message}</FieldError>
              )}
            </Field>
          )}
        />
      </form>
      {!brandingTheme && (
        <Button
          className="mt-4 w-full"
          variant="outline"
          size="sm"
          onClick={() => window.open("/share-secret", "_blank", "noopener")}
        >
          Share Your Own Secret
          <ArrowRight className="ml-2 size-3" />
        </Button>
      )}
    </div>
  );
};
