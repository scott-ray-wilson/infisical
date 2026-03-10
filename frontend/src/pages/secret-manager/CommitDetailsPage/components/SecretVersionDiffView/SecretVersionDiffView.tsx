/* eslint-disable no-nested-ternary */
import { FolderIcon, KeyRoundIcon, TrashIcon } from "lucide-react";
import { twMerge } from "tailwind-merge";

import {
  FolderDiffView,
  FolderVersionData,
  SecretDiffView,
  SecretVersionData
} from "@app/components/secrets/diff";
import {
  Badge,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  UnstableAccordion,
  UnstableAccordionContent,
  UnstableAccordionItem,
  UnstableAccordionTrigger,
  UnstableIconButton
} from "@app/components/v3";

export interface Version {
  id?: string;
  version: number;
  isRedacted?: boolean;
  redactedAt?: Date | null;
  redactedByUserId?: string | null;
  [key: string]: any;
}

export interface DiffViewItem {
  type: "secret" | "folder";
  isAdded?: boolean;
  isDeleted?: boolean;
  isUpdated?: boolean;
  versions?: Version[];
  isRollback?: boolean;
  id: string;
  secretKey?: string;
  folderName?: string;
}

interface SecretVersionDiffViewProps {
  item: DiffViewItem;
  isCollapsed?: boolean;
  onToggleCollapse?: (id: string) => void;
  showHeader?: boolean;
  customHeader?: JSX.Element;
  onDiscard?: VoidFunction;
  headerExtra?: JSX.Element;
  onRevealOldValue?: () => Promise<void>;
  onRevealNewValue?: () => Promise<void>;
  isLoadingOldValue?: boolean;
  isLoadingNewValue?: boolean;
}

export const SecretVersionDiffView = ({
  item,
  isCollapsed = false,
  onToggleCollapse,
  showHeader = true,
  customHeader,
  onDiscard,
  headerExtra,
  onRevealOldValue,
  onRevealNewValue,
  isLoadingOldValue,
  isLoadingNewValue
}: SecretVersionDiffViewProps) => {
  const collapsed = onToggleCollapse ? isCollapsed : undefined;

  if (!item.versions || item.versions.length === 0) {
    return <div className="px-6 py-3 text-accent">No details available</div>;
  }

  const sortedVersions = [...item.versions].sort((a, b) => b.version - a.version);
  let oldVersion = null;
  let newVersion = null;

  let operationType: "create" | "update" | "delete" = "update";
  if (item.isAdded) operationType = "create";
  else if (item.isDeleted) operationType = "delete";

  if (item.isUpdated && sortedVersions.length >= 2) {
    if (item.isRollback) {
      [oldVersion, newVersion] = sortedVersions;
    } else {
      [newVersion, oldVersion] = sortedVersions;
    }
  } else if (item.isAdded) {
    [newVersion] = sortedVersions;
  } else if (item.isDeleted) {
    [oldVersion] = sortedVersions;
  } else {
    return null;
  }

  // Convert versions to SecretVersionData format for SecretDiffView
  const convertToSecretVersionData = (version: Version | null): SecretVersionData | undefined => {
    if (!version) return undefined;

    // Handle tags - normalize to string array (slugs only)
    let tags: { slug: string; color: string }[] | undefined;
    if (Array.isArray(version.tags)) {
      tags = version.tags.map((tag: { slug?: string; color?: string } | string) => {
        if (typeof tag === "string") {
          return { slug: tag, color: "" };
        }
        return { slug: tag.slug ?? "", color: tag.color ?? "" };
      });
    }

    const metadata = (version.metadata ?? version.secretMetadata) as
      | Array<{ key: string; value: string }>
      | undefined;

    return {
      isRedacted: version.isRedacted,
      secretKey: version.secretKey as string | undefined,
      secretValue: version.secretValue as string | undefined,
      secretValueHidden: version.secretValueHidden as boolean | undefined,
      secretComment: version.comment as string | undefined,
      tags,
      secretMetadata: metadata,
      skipMultilineEncoding: version.skipMultilineEncoding as boolean | undefined
    };
  };

  // Convert versions to FolderVersionData format for FolderDiffView
  const convertToFolderVersionData = (version: Version | null): FolderVersionData | undefined => {
    if (!version) return undefined;

    return {
      name: version.name as string | undefined,
      description: version.description as string | undefined
    };
  };

  const oldSecretData = convertToSecretVersionData(oldVersion);
  const newSecretData = convertToSecretVersionData(newVersion);

  const oldFolderData = convertToFolderVersionData(oldVersion);
  const newFolderData = convertToFolderVersionData(newVersion);

  const isSecret = item.type === "secret";
  const key = isSecret ? item.secretKey || "Unnamed Secret" : item.folderName || "Unnamed Folder";

  let changeBadgeVariant: "success" | "warning" | "danger" | undefined;
  let changeBadgeLabel: string | undefined;

  if (item.isDeleted) {
    changeBadgeVariant = "danger";
    changeBadgeLabel = "Deleted";
  } else if (item.isAdded) {
    changeBadgeVariant = "success";
    changeBadgeLabel = "Added";
  } else if (item.isUpdated) {
    changeBadgeVariant = "warning";
    changeBadgeLabel = "Updated";
  }

  const diffContent = (
    <div className="p-3">
      {item.type === "secret" ? (
        <SecretDiffView
          operationType={operationType}
          oldVersion={oldSecretData}
          newVersion={newSecretData}
          onRevealOldValue={onRevealOldValue}
          onRevealNewValue={onRevealNewValue}
          isLoadingOldValue={isLoadingOldValue}
          isLoadingNewValue={isLoadingNewValue}
        />
      ) : (
        <FolderDiffView
          operationType={operationType}
          oldVersion={oldFolderData}
          newVersion={newFolderData}
        />
      )}
    </div>
  );

  // External controlled collapse (used by CommitDetailsTab)
  const accordionProps = onToggleCollapse
    ? {
        type: "single" as const,
        value: collapsed ? "" : item.id,
        onValueChange: () => onToggleCollapse(item.id)
      }
    : {
        type: "single" as const,
        defaultValue: isCollapsed ? undefined : item.id,
        collapsible: true as const
      };

  const TypeIcon = isSecret ? KeyRoundIcon : FolderIcon;

  return (
    <UnstableAccordion {...accordionProps} className="overflow-clip rounded-md border border-border">
      <UnstableAccordionItem value={item.id} className="border-b-0">
        {showHeader && (
          <UnstableAccordionTrigger>
            {customHeader ?? (
              <>
                <TypeIcon className="size-4 shrink-0 text-accent" />
                <span className={twMerge("flex-1 truncate text-left", item.isDeleted && "line-through text-danger/70")}>
                  {key}
                </span>
                {changeBadgeLabel && (
                  <Badge variant={changeBadgeVariant}>{changeBadgeLabel}</Badge>
                )}
                {headerExtra}
                {onDiscard && (
                  <Tooltip delayDuration={300}>
                    <TooltipTrigger asChild>
                      <UnstableIconButton
                        variant="ghost"
                        size="xs"
                        className="hover:text-danger"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDiscard();
                        }}
                      >
                        <TrashIcon />
                      </UnstableIconButton>
                    </TooltipTrigger>
                    <TooltipContent side="left">Discard change</TooltipContent>
                  </Tooltip>
                )}
              </>
            )}
          </UnstableAccordionTrigger>
        )}
        <UnstableAccordionContent className="p-0">
          {diffContent}
        </UnstableAccordionContent>
      </UnstableAccordionItem>
    </UnstableAccordion>
  );
};
