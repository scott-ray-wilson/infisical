import { useState } from "react";
import { faArrowRightArrowLeft, faEllipsisVertical } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { useNavigate, useParams } from "@tanstack/react-router";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  Modal,
  ModalContent,
  Tab,
  TabList,
  Tabs
} from "@app/components/v2";
import { ROUTE_PATHS } from "@app/const/routes";
import { useWorkspace } from "@app/context";
import { usePopUp } from "@app/hooks";
import { WorkspaceEnv } from "@app/hooks/api/workspace/types";

import { CompareEnvironments } from "../CompareEnvironments";

const COMPARE_ENVIRONMENT_TAB = "__COMPARE_ENVIRONMENT_TAB__";

type Props = {
  secretPath: string;
};

const TABS_TO_SHOW = 5;

export const EnvironmentTabs = ({ secretPath }: Props) => {
  const { currentWorkspace } = useWorkspace();
  const currentEnv = useParams({
    from: ROUTE_PATHS.SecretManager.SecretDashboardPage.id,
    select: (el) => el.envSlug
  });

  const [isNavigating, setIsNavigating] = useState(false);

  const navigate = useNavigate();

  const { popUp, handlePopUpOpen, handlePopUpToggle } = usePopUp(["compareEnvironments"] as const);

  const selectedIndex = currentWorkspace.environments.findIndex((env) => env.slug === currentEnv);

  let tabEnvironments: WorkspaceEnv[];
  let dropdownEnvironments: WorkspaceEnv[];

  if (selectedIndex < TABS_TO_SHOW) {
    tabEnvironments = currentWorkspace.environments.slice(0, TABS_TO_SHOW);
    dropdownEnvironments = currentWorkspace.environments.slice(TABS_TO_SHOW);
  } else {
    tabEnvironments = [
      ...currentWorkspace.environments.slice(0, TABS_TO_SHOW - 1),
      currentWorkspace.environments[selectedIndex]
    ];
    dropdownEnvironments = currentWorkspace.environments
      .slice(TABS_TO_SHOW - 1)
      .filter((env) => env.slug !== currentEnv);
  }

  const handleSelect = async (envSlug: string) => {
    if (isNavigating) return;

    setIsNavigating(true);
    await navigate({
      to: ROUTE_PATHS.SecretManager.SecretDashboardPage.path,
      params: {
        envSlug,
        projectId: currentWorkspace.id
      },
      search: (prev) => prev
    });
    setIsNavigating(false);
  };

  return (
    <>
      <Tabs
        value={currentEnv}
        onValueChange={(value) => {
          if (value === COMPARE_ENVIRONMENT_TAB) {
            handlePopUpOpen("compareEnvironments");
            return;
          }

          handleSelect(value);
        }}
        className="mt-6"
        defaultValue="environment-tabs"
      >
        <TabList>
          {tabEnvironments.map((environment) => (
            <Tab className="max-w-[12vw] truncate" value={environment.slug}>
              <p className="truncate">{environment.name}</p>
            </Tab>
          ))}
          <DropdownMenu>
            <DropdownMenuTrigger>
              <Tab value={COMPARE_ENVIRONMENT_TAB}>
                <FontAwesomeIcon icon={faEllipsisVertical} />
              </Tab>
            </DropdownMenuTrigger>
            <DropdownMenuContent sideOffset={2} align="end">
              {dropdownEnvironments.map((environment) => (
                <DropdownMenuItem
                  key={environment.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSelect(environment.slug);
                  }}
                >
                  {environment.name}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          {currentWorkspace.environments.length > 1 && (
            // <DropdownMenu>
            //   <DropdownMenuTrigger className="ml-auto">
            <Tab className="ml-auto" value={COMPARE_ENVIRONMENT_TAB}>
              <div className="flex items-center gap-x-2 whitespace-nowrap">
                <FontAwesomeIcon icon={faArrowRightArrowLeft} />
                Compare Environments
              </div>
            </Tab>
            //   </DropdownMenuTrigger>
            //   <DropdownMenuContent sideOffset={2} align="end">
            //     <div className="p-2">
            //       <div className="text-mineshaft-400">
            //         Select two or more environments to compare
            //       </div>
            //       <FilterableSelect
            //         value={selectedEnvironments}
            //         onChange={(value) => {
            //           const selected = value as MultiValue<WorkspaceEnv>;
            //
            //           setSelectedEnvironments((selected as WorkspaceEnv[]) ?? []);
            //         }}
            //         options={currentWorkspace.environments}
            //         getOptionValue={(option) => option.slug}
            //         getOptionLabel={(option) => option.name}
            //         isMulti
            //       />
            //     </div>
            //   </DropdownMenuContent>
            // </DropdownMenu>
          )}
        </TabList>
      </Tabs>
      <Modal
        isOpen={popUp.compareEnvironments.isOpen}
        onOpenChange={(isOpen) => handlePopUpToggle("compareEnvironments", isOpen)}
      >
        <ModalContent
          title="Compare Environments"
          subTitle="Compare secrets across multiple environments"
          className="!w-[98vw] max-w-none"
          bodyClassName="!overflow-visible"
        >
          <CompareEnvironments currentEnvSlug={currentEnv} secretPath={secretPath} />
        </ModalContent>
      </Modal>
    </>
  );
};
