import { ArrowRight, Check, Copy, Eye, EyeOff } from "lucide-react";

import { Button, IconButton } from "@app/components/v3";
import { useTimedReset, useToggle } from "@app/hooks";
import { TAccessSharedSecretResponse } from "@app/hooks/api/secretSharing";

import { BrandingTheme } from "../ViewSharedSecretByIDPage";
import { SecretShareInfo } from "./SecretShareInfo";

type Props = {
  secret: TAccessSharedSecretResponse;
  brandingTheme?: BrandingTheme;
};

export const SecretContainer = ({ secret, brandingTheme }: Props) => {
  const [isVisible, setIsVisible] = useToggle(false);
  const [, isCopyingSecret, setCopyTextSecret] = useTimedReset<string>({
    initialState: "Copy to clipboard"
  });

  const hiddenSecret = "*".repeat(secret.secretValue.length);

  const panelStyle = brandingTheme
    ? {
        backgroundColor: brandingTheme.panelBg,
        borderColor: brandingTheme.panelBorder
      }
    : undefined;

  const secretDisplayStyle = brandingTheme
    ? {
        backgroundColor: brandingTheme.inputBg,
        borderColor: brandingTheme.panelBorder,
        color: brandingTheme.textColor
      }
    : undefined;

  const iconButtonStyle = brandingTheme
    ? {
        backgroundColor: brandingTheme.buttonBg,
        color: brandingTheme.textColor
      }
    : undefined;

  return (
    <div
      className={`rounded-lg border p-4 ${brandingTheme ? "" : "border-border bg-card"}`}
      style={panelStyle}
    >
      <div
        className={`flex items-center justify-between rounded-md border p-2 pl-3 text-base ${
          brandingTheme ? "" : "border-border bg-container text-muted"
        }`}
        style={secretDisplayStyle}
      >
        <p className="break-all whitespace-pre-wrap">
          {isVisible ? secret.secretValue : hiddenSecret}
        </p>
        <div className="flex">
          <IconButton
            aria-label="copy icon"
            variant="ghost"
            className="size-9 hover:opacity-70"
            onClick={() => {
              navigator.clipboard.writeText(secret.secretValue);
              setCopyTextSecret("Copied");
            }}
            style={iconButtonStyle}
          >
            {isCopyingSecret ? <Check className="size-4" /> : <Copy className="size-4" />}
          </IconButton>
          <IconButton
            aria-label="toggle visibility"
            variant="ghost"
            className="ml-2 size-9 hover:opacity-70"
            onClick={() => setIsVisible.toggle()}
            style={iconButtonStyle}
          >
            {isVisible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          </IconButton>
        </div>
      </div>
      <SecretShareInfo secret={secret} brandingTheme={brandingTheme} />
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
