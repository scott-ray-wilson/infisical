import { useState } from "react";
import {
  faArrowUpRightFromSquare,
  faUpRightAndDownLeftFromCenter,
  faWindowRestore
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { twMerge } from "tailwind-merge";

import { Button, IconButton, Tooltip } from "@app/components/v2";

import { AccessTree, AccessTreeProps } from "./AccessTree";

type Props = {
  className?: string;
} & AccessTreeProps;

enum ViewMode {
  Docked = "docked",
  Modal = "modal",
  Undocked = "undocked"
}

export const AccessTreeCard = ({ className, ...props }: Props) => {
  const [viewMode, setViewMode] = useState<ViewMode>(ViewMode.Docked);

  const handleToggleModalView = () =>
    setViewMode((prev) => (prev === ViewMode.Modal ? ViewMode.Docked : ViewMode.Modal));

  const handleToggleUndockedView = () =>
    setViewMode((prev) => (prev === ViewMode.Undocked ? ViewMode.Docked : ViewMode.Undocked));

  const undockButtonLabel = `${viewMode === ViewMode.Undocked ? "Dock" : "Undock"} View`;
  const windowButtonLabel = `${viewMode === ViewMode.Modal ? "Dock" : "Expand"} View`;

  return (
    <div
      className={twMerge(
        "w-full",
        viewMode === ViewMode.Modal && "fixed inset-0 z-50 p-10",
        viewMode === ViewMode.Undocked &&
          "fixed bottom-4 left-20 z-50 h-[40%] w-[38%] min-w-[32rem] lg:w-[34%]",
        className
      )}
    >
      <div
        className={twMerge(
          "mb-4 h-full w-full rounded-lg border border-mineshaft-600 bg-mineshaft-900 transition-transform duration-500",
          viewMode === ViewMode.Docked ? "relative p-4" : "relative p-0"
        )}
      >
        {viewMode === ViewMode.Docked ? (
          <div className="mb-4 flex items-start justify-between border-b border-mineshaft-400 pb-4">
            <div>
              <h3 className="text-lg font-semibold text-mineshaft-100">Access Tree</h3>
              <p className="text-sm leading-3 text-mineshaft-400">
                Visual access policies for the configured role.
              </p>
            </div>
            <div className="whitespace-nowrap">
              <Button
                variant="outline_bg"
                colorSchema="secondary"
                type="submit"
                className="h-10 rounded-r-none bg-mineshaft-700"
                leftIcon={<FontAwesomeIcon icon={faWindowRestore} />}
                onClick={handleToggleUndockedView}
              >
                Undock
              </Button>
              <Button
                variant="outline_bg"
                colorSchema="secondary"
                type="submit"
                className="h-10 rounded-l-none bg-mineshaft-600"
                leftIcon={<FontAwesomeIcon icon={faUpRightAndDownLeftFromCenter} />}
                onClick={handleToggleModalView}
              >
                Expand
              </Button>
            </div>
          </div>
        ) : (
          <div className="absolute right-2 top-2 z-50">
            <Tooltip position="bottom" content={undockButtonLabel}>
              <IconButton
                className="mr-1 rounded"
                colorSchema="secondary"
                variant="plain"
                onClick={handleToggleUndockedView}
                ariaLabel={undockButtonLabel}
              >
                <FontAwesomeIcon
                  icon={viewMode === ViewMode.Undocked ? faArrowUpRightFromSquare : faWindowRestore}
                />
              </IconButton>
            </Tooltip>
            <Tooltip position="bottom" content={windowButtonLabel}>
              <IconButton
                className="rounded"
                colorSchema="secondary"
                variant="plain"
                onClick={handleToggleModalView}
                ariaLabel={windowButtonLabel}
              >
                <FontAwesomeIcon
                  icon={
                    viewMode === ViewMode.Modal
                      ? faArrowUpRightFromSquare
                      : faUpRightAndDownLeftFromCenter
                  }
                />
              </IconButton>
            </Tooltip>
          </div>
        )}
        <div
          className={twMerge(
            "flex items-center space-x-4",
            viewMode === ViewMode.Docked ? "h-96" : "h-full"
          )}
        >
          <AccessTree {...props} />
        </div>
      </div>
    </div>
  );
};
