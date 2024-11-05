import { Controller, useForm } from "react-hook-form";
import { useRouter } from "next/router";
import { faChevronLeft } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

import { createNotification } from "@app/components/notifications";
import { OrgPermissionCan, ProjectPermissionCan } from "@app/components/permissions";
import {
  Button,
  DeleteActionModal,
  EmptyState,
  FormControl,
  Input,
  Spinner
} from "@app/components/v2";
import {
  OrgPermissionActions,
  OrgPermissionSubjects,
  ProjectPermissionActions,
  ProjectPermissionSub,
  useOrganization
} from "@app/context";
import { withPermission } from "@app/hoc";
import { usePopUp } from "@app/hooks";
import {
  useDeleteProjectTemplate,
  useGetProjectTemplateById
} from "@app/hooks/api/projectTemplates";
import { EditProjectTemplate } from "@app/views/Org/ProjectTemplatePage/components/EditProjectTemplate";
import { CopyButton } from "@app/views/Settings/ProjectSettingsPage/components/ProjectNameChangeSection/CopyButton";

export const ProjectTemplatePage = withPermission(
  () => {
    const router = useRouter();
    const { currentOrg } = useOrganization();

    const templateId = router.query.templateId as string;

    const { data: projectTemplate, isLoading } = useGetProjectTemplateById(templateId);

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
          <EditProjectTemplate projectTemplate={projectTemplate} />
        ) : (
          <EmptyState title="Error: Unable to find project template." className="py-12" />
        )}
      </div>
    );
  },
  { action: OrgPermissionActions.Read, subject: OrgPermissionSubjects.ProjectTemplates }
);
