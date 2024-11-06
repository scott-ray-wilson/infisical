import { useRouter } from "next/router";
import { faEllipsis } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { twMerge } from "tailwind-merge";

import { createNotification } from "@app/components/notifications";
import { OrgPermissionCan } from "@app/components/permissions";
import {
  DeleteActionModal,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  IconButton
} from "@app/components/v2";
import { OrgPermissionActions, OrgPermissionSubjects, useOrganization } from "@app/context";
import { usePopUp } from "@app/hooks";
import { TProjectTemplate, useDeleteProjectTemplate } from "@app/hooks/api/projectTemplates";
import { ProjectTemplateRolesSection } from "@app/views/Org/ProjectTemplatePage/components/ProjectTemplateRolesSection";
import { ProjectTemplateDetailsModal } from "@app/views/Org/ProjectTemplatesPage/components/ProjectTemplateDetailsModal";

import { ProjectTemplateEnvironmentsForm } from "./ProjectTemplateEnvironmentsForm";

type Props = {
  projectTemplate: TProjectTemplate;
};

export const EditProjectTemplate = ({ projectTemplate }: Props) => {
  const { handlePopUpToggle, popUp, handlePopUpOpen, handlePopUpClose } = usePopUp([
    "removeTemplate",
    "editDetails"
  ] as const);

  const router = useRouter();
  const { currentOrg } = useOrganization();

  const { id: templateId, name, description } = projectTemplate;

  const deleteProjectTemplate = useDeleteProjectTemplate();

  const handleRemoveTemplate = async () => {
    try {
      await deleteProjectTemplate.mutateAsync({
        templateId
      });
      createNotification({
        text: "Successfully removed project template",
        type: "success"
      });
      router.push(`/org/${currentOrg?.id}/project-templates`);
    } catch (error) {
      console.error(error);
      createNotification({
        text: "Failed to remove project template",
        type: "error"
      });
    }
    handlePopUpClose("removeTemplate");
  };

  return (
    <>
      <div className="mb-4 flex items-center justify-between border-b border-bunker-400">
        <div className="mb-4 flex flex-col">
          <h3 className="text-xl font-semibold">{name}</h3>
          <h2 className="text-sm text-mineshaft-400">{description || "Project Template"}</h2>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <IconButton
              colorSchema="secondary"
              variant="plain"
              size="lg"
              ariaLabel="More options"
              className="mr-2"
            >
              <FontAwesomeIcon icon={faEllipsis} />
            </IconButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="p-1">
            <OrgPermissionCan
              I={OrgPermissionActions.Edit}
              a={OrgPermissionSubjects.ProjectTemplates}
            >
              {(isAllowed) => (
                <DropdownMenuItem
                  className={twMerge(
                    !isAllowed && "pointer-events-none cursor-not-allowed opacity-50"
                  )}
                  onClick={() => handlePopUpOpen("editDetails")}
                  disabled={!isAllowed}
                >
                  Edit Details
                </DropdownMenuItem>
              )}
            </OrgPermissionCan>
            <OrgPermissionCan
              I={OrgPermissionActions.Delete}
              a={OrgPermissionSubjects.ProjectTemplates}
            >
              {(isAllowed) => (
                <DropdownMenuItem
                  className={twMerge(
                    isAllowed
                      ? "hover:!bg-red-500 hover:!text-white"
                      : "pointer-events-none cursor-not-allowed opacity-50"
                  )}
                  onClick={() => {
                    handlePopUpOpen("removeTemplate");
                  }}
                  disabled={!isAllowed}
                >
                  Delete Template
                </DropdownMenuItem>
              )}
            </OrgPermissionCan>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <ProjectTemplateEnvironmentsForm projectTemplate={projectTemplate} />
      <ProjectTemplateRolesSection projectTemplate={projectTemplate} />
      <ProjectTemplateDetailsModal
        isOpen={popUp.editDetails.isOpen}
        onOpenChange={(isOpen) => handlePopUpToggle("editDetails", isOpen)}
        projectTemplate={projectTemplate}
      />
      <DeleteActionModal
        isOpen={popUp.removeTemplate.isOpen}
        title={`Are you sure want to delete ${projectTemplate.name}?`}
        deleteKey="confirm"
        onChange={(isOpen) => handlePopUpToggle("removeTemplate", isOpen)}
        onDeleteApproved={handleRemoveTemplate}
      />
    </>
  );
};
