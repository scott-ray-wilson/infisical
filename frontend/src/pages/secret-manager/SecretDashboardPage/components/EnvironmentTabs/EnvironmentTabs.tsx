import { useState } from "react";
import { faArrowRightArrowLeft } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { useNavigate, useParams } from "@tanstack/react-router";

import { Modal, ModalContent, Tab, TabList, Tabs } from "@app/components/v2";
import { ROUTE_PATHS } from "@app/const/routes";
import { useWorkspace } from "@app/context";
import { usePopUp } from "@app/hooks";
import { WorkspaceEnv } from "@app/hooks/api/workspace/types";

const COMPARE_ENVIRONMENT_TAB = "__COMPARE_ENVIRONMENT_TAB__";

export const EnvironmentTabs = () => {
  const { currentWorkspace } = useWorkspace();
  const currentEnv = useParams({
    from: ROUTE_PATHS.SecretManager.SecretDashboardPage.id,
    select: (el) => el.envSlug
  });

  const navigate = useNavigate();

  const [selectedEnvironments, setSelectedEnvironments] = useState<WorkspaceEnv[]>(() => [
    currentWorkspace.environments.find((env) => env.slug === currentEnv)!
  ]);

  const { popUp, handlePopUpOpen, handlePopUpToggle } = usePopUp(["compareEnvironments"] as const);

  return (
    <>
      <Tabs
        value={currentEnv}
        onValueChange={(value) => {
          if (value === COMPARE_ENVIRONMENT_TAB) {
            handlePopUpOpen("compareEnvironments");
            return;
          }

          navigate({
            to: ROUTE_PATHS.SecretManager.SecretDashboardPage.path,
            params: {
              envSlug: value,
              projectId: currentWorkspace.id
            },
            search: (prev) => prev
          });
        }}
        className="mt-3"
        defaultValue="environment-tabs"
      >
        <TabList>
          {currentWorkspace.environments.map((environment) => (
            <Tab value={environment.slug}>{environment.name}</Tab>
          ))}
          {currentWorkspace.environments.length > 1 && (
            // <DropdownMenu>
            //   <DropdownMenuTrigger className="ml-auto">
            <Tab value={COMPARE_ENVIRONMENT_TAB}>
              <div className="flex items-center gap-x-2">
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
        >
          <div>hi</div>
        </ModalContent>
      </Modal>
    </>
  );
};
