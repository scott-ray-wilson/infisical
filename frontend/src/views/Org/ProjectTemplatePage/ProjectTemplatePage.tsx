import { useRouter } from "next/router";
import { faChevronLeft } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

import { createNotification } from "@app/components/notifications";
import { OrgPermissionCan } from "@app/components/permissions";
import { Button, DeleteActionModal, EmptyState, Spinner } from "@app/components/v2";
import { OrgPermissionActions, OrgPermissionSubjects, useOrganization } from "@app/context";
import { withPermission } from "@app/hoc";
import { usePopUp } from "@app/hooks";
import {
  useDeleteProjectTemplate,
  useGetProjectTemplateById
} from "@app/hooks/api/projectTemplates";

export const ProjectTemplatePage = withPermission(
  () => {
    const router = useRouter();
    const { currentOrg } = useOrganization();

    const templateId = router.query.templateId as string;

    const { data: projectTemplate, isLoading } = useGetProjectTemplateById(templateId);

    const deleteProjectTemplate = useDeleteProjectTemplate();

    const { handlePopUpToggle, popUp, handlePopUpOpen, handlePopUpClose } = usePopUp([
      "removeTemplate"
    ] as const);

    const handleRemoveTemplate = async () => {
      if (!templateId) return;

      try {
        await deleteProjectTemplate.mutateAsync({
          templateId
        });
        createNotification({
          text: "Successfully removed project template",
          type: "success"
        });
        router.push(`/org/${currentOrg?.id}/project-templates/${templateId}`);
      } catch (error) {
        console.error(error);
        createNotification({
          text: "Failed to remove project template",
          type: "error"
        });
      }
      handlePopUpClose("removeTemplate");
    };

    if (isLoading) {
      return (
        <div className="flex w-full items-center justify-center p-24">
          <Spinner />
        </div>
      );
    }

    return (
      <div className="container mx-auto flex max-w-7xl flex-col justify-between bg-bunker-800 p-6 text-white">
        <div className="mb-4">
          <Button
            variant="link"
            type="submit"
            leftIcon={<FontAwesomeIcon icon={faChevronLeft} />}
            onClick={() => {
              router.push(`/org/${currentOrg?.id}/project-templates`);
            }}
            className="mb-4"
          >
            Project Templates
          </Button>
        </div>
        {projectTemplate ? (
          <>
            <div className="mb-4 flex items-start justify-between ">
              <div>
                <h3 className="text-xl font-semibold text-mineshaft-100">{projectTemplate.name}</h3>
                <h2 className="text-mineshaft-400">Project Template</h2>
              </div>

              <OrgPermissionCan
                I={OrgPermissionActions.Delete}
                a={OrgPermissionSubjects.ProjectTemplates}
              >
                {(isAllowed) => (
                  <Button
                    colorSchema="danger"
                    variant="outline_bg"
                    size="xs"
                    isDisabled={!isAllowed}
                    isLoading={deleteProjectTemplate.isLoading}
                    onClick={() => handlePopUpOpen("removeTemplate")}
                  >
                    Delete Template
                  </Button>
                )}
              </OrgPermissionCan>
            </div>

            <DeleteActionModal
              isOpen={popUp.removeTemplate.isOpen}
              title={`Are you sure want to delete ${projectTemplate.name}?`}
              deleteKey="confirm"
              onChange={(isOpen) => handlePopUpToggle("removeTemplate", isOpen)}
              onDeleteApproved={handleRemoveTemplate}
            />
          </>
        ) : (
          <EmptyState title="Error: Unable to find project template." className="py-12" />
        )}
      </div>
    );
  },
  { action: OrgPermissionActions.Read, subject: OrgPermissionSubjects.ProjectTemplates }
);
