import { useEffect } from "react";
import { useRouter } from "next/router";
import { faPlus } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

import { OrgPermissionCan } from "@app/components/permissions";
import { Button, UpgradePlanModal } from "@app/components/v2";
import { OrgPermissionActions, OrgPermissionSubjects, useSubscription } from "@app/context";
import { usePopUp } from "@app/hooks/usePopUp";

import { ProjectTemplatesTable } from "./ProjectTemplatesTable";

export const ProjectTemplatesSection = () => {
  const { subscription } = useSubscription();
  const router = useRouter();

  const { popUp, handlePopUpOpen, handlePopUpToggle } = usePopUp([
    "upgradePlan",
    "addTemplate"
  ] as const);

  useEffect(() => {
    if (subscription && !subscription.projectTemplates) {
      handlePopUpOpen("upgradePlan");
    }
  }, [subscription]);

  return (
    <div className="mb-6 rounded-lg border border-mineshaft-600 bg-mineshaft-900 p-4">
      <div className="mb-4 flex justify-between">
        <p className="text-xl font-semibold text-mineshaft-100">Project Templates</p>
        <OrgPermissionCan
          I={OrgPermissionActions.Create}
          a={OrgPermissionSubjects.ProjectTemplates}
        >
          {(isAllowed) => (
            <Button
              colorSchema="primary"
              type="submit"
              leftIcon={<FontAwesomeIcon icon={faPlus} />}
              onClick={() => handlePopUpOpen("addTemplate")}
              isDisabled={!isAllowed}
            >
              Add Template
            </Button>
          )}
        </OrgPermissionCan>
      </div>
      <ProjectTemplatesTable />
      <UpgradePlanModal
        isOpen={popUp.upgradePlan.isOpen}
        onOpenChange={(isOpen) => {
          if (!isOpen) {
            router.back();
            return;
          }

          handlePopUpToggle("upgradePlan", isOpen);
        }}
        text="You can create project templates if you switch to Infisical's Enterprise plan."
      />
    </div>
  );
};
