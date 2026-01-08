import { useState } from "react";
import { faCheck, faFolder, faPencil, faXmark } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { twMerge } from "tailwind-merge";

import { Checkbox, IconButton, Td, Tr } from "@app/components/v2";
import { UnstableTable, UnstableTableCell, UnstableTableRow } from "@app/components/v3";
import { CheckIcon, FolderIcon, XIcon } from "lucide-react";

type Props = {
  folderName: string;
  environments: { name: string; slug: string }[];
  isFolderPresentInEnv: (name: string, env: string) => boolean;
  onClick: (path: string) => void;
  isSelected: boolean;
  onToggleFolderSelect: (folderName: string) => void;
  onToggleFolderEdit: (name: string) => void;
};

export const SecretOverviewFolderRow = ({
  folderName,
  environments = [],
  isFolderPresentInEnv,
  isSelected,
  onToggleFolderSelect,
  onToggleFolderEdit,
  onClick
}: Props) => {
  const [isClicking, setIsClicking] = useState(false);
  const handleClick = () => {
    if (isClicking) return;

    setIsClicking(true);
    onClick(folderName);
    setTimeout(() => setIsClicking(false), 1000);
  };
  return (
    <UnstableTableRow className="group" onClick={handleClick}>
      <UnstableTableCell>
        <Checkbox
          id={`checkbox-${folderName}`}
          isChecked={isSelected}
          onCheckedChange={() => {
            onToggleFolderSelect(folderName);
          }}
          onClick={(e) => {
            e.stopPropagation();
          }}
          className={twMerge("hidden group-hover:flex", isSelected && "flex")}
        />
        <FolderIcon
          className={twMerge(
            "block size-4 text-warning group-hover:!hidden",
            isSelected && "!hidden"
          )}
        />
      </UnstableTableCell>
      <UnstableTableCell colSpan={environments.length <= 1 ? 2 : 1}>{folderName}</UnstableTableCell>
      {environments.length > 1 &&
        environments.map(({ slug }, i) => {
          const isPresent = isFolderPresentInEnv(folderName, slug);

          return (
            <UnstableTableCell
              className="border-l border-border text-center"
              key={`sec-overview-${slug}-${i + 1}-folder`}
            >
              {isPresent ? (
                <CheckIcon className="inline-block size-4 text-success" />
              ) : (
                <XIcon className="size-4 text-danger" />
              )}
            </UnstableTableCell>
          );
        })}
    </UnstableTableRow>
  );
};
