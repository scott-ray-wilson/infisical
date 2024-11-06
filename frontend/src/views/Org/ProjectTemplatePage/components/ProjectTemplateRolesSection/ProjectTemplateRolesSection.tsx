import { faEllipsisV, faPlus, faTrash, faUnlock } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { AnimatePresence, motion } from "framer-motion";

import { OrgPermissionCan, ProjectPermissionCan } from "@app/components/permissions";
import {
  Button,
  DeleteActionModal,
  EmptyState,
  IconButton,
  Table,
  TableContainer,
  TBody,
  Td,
  Th,
  THead,
  Tr
} from "@app/components/v2";
import {
  OrgPermissionActions,
  OrgPermissionSubjects,
  ProjectPermissionActions,
  ProjectPermissionSub,
  useOrgPermission
} from "@app/context";
import { usePopUp } from "@app/hooks";
import { TProjectTemplate, useUpdateProjectTemplate } from "@app/hooks/api/projectTemplates";

import { ProjectTemplateEditRoleForm } from "./ProjectTemplateEditRoleForm";

type Props = {
  projectTemplate: TProjectTemplate;
};

export const ProjectTemplateRolesSection = ({ projectTemplate }: Props) => {
  const { popUp, handlePopUpOpen, handlePopUpToggle, handlePopUpClose } = usePopUp([
    "removeRole",
    "editRole"
  ] as const);

  const { permission } = useOrgPermission();

  const { roles } = projectTemplate;

  const updateProjectTemplate = useUpdateProjectTemplate();

  const handleRemoveRole = async () => {};

  return (
    <div className="relative">
      <AnimatePresence>
        {popUp?.editRole.isOpen ? (
          <motion.div
            key="privilege-modify"
            transition={{ duration: 0.3 }}
            initial={{ opacity: 0, translateX: 30 }}
            animate={{ opacity: 1, translateX: 0 }}
            exit={{ opacity: 0, translateX: 30 }}
            className="absolute min-h-[10rem] w-full"
          >
            <ProjectTemplateEditRoleForm
              onGoBack={() => handlePopUpClose("editRole")}
              projectTemplate={projectTemplate}
              role={popUp?.editRole?.data}
              isDisabled={permission.cannot(
                OrgPermissionActions.Edit,
                OrgPermissionSubjects.ProjectTemplates
              )}
            />
          </motion.div>
        ) : (
          <motion.div
            key="privilege-list"
            transition={{ duration: 0.3 }}
            initial={{ opacity: 0, translateX: 0 }}
            animate={{ opacity: 1, translateX: 0 }}
            exit={{ opacity: 0, translateX: -30 }}
            className="absolute w-full rounded-lg border border-mineshaft-600 bg-mineshaft-900 p-4"
          >
            <div className="flex items-center justify-between border-b border-mineshaft-400 pb-4">
              <div>
                <h2 className="text-lg font-semibold">Project Roles</h2>
                <p className="text-sm text-mineshaft-400">
                  Add, edit and remove roles for this project template
                </p>
              </div>
              <OrgPermissionCan
                I={OrgPermissionActions.Edit}
                a={OrgPermissionSubjects.ProjectTemplates}
                renderTooltip
                allowedLabel="Add Privilege"
              >
                {(isAllowed) => (
                  <Button
                    onClick={() => {
                      handlePopUpOpen("editRole");
                    }}
                    colorSchema="primary"
                    className="ml-auto"
                    variant="outline_bg"
                    leftIcon={<FontAwesomeIcon icon={faPlus} />}
                    isDisabled={!isAllowed}
                  >
                    Add Role
                  </Button>
                )}
              </OrgPermissionCan>
            </div>
            <div className="py-4">
              <TableContainer>
                <Table>
                  <THead>
                    <Tr>
                      <Th>Name</Th>
                      <Th className="w-5" />
                    </Tr>
                  </THead>
                  <TBody>
                    {roles.length ? (
                      roles.map((role, index) => {
                        return (
                          <Tr
                            key={role.slug}
                            className="group w-full cursor-pointer transition-colors duration-100 hover:bg-mineshaft-700"
                            role="button"
                            tabIndex={0}
                            onKeyDown={(evt) => {
                              if (evt.key === "Enter") {
                                handlePopUpOpen("editRole", role);
                              }
                            }}
                            onClick={() => handlePopUpOpen("editRole", role)}
                          >
                            <Td>{role.slug}</Td>
                            <Td>
                              <div className="flex space-x-2 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                                <OrgPermissionCan
                                  I={OrgPermissionActions.Edit}
                                  a={OrgPermissionSubjects.ProjectTemplates}
                                  renderTooltip
                                  allowedLabel="Remove Role"
                                >
                                  {(isAllowed) => (
                                    <IconButton
                                      colorSchema="danger"
                                      ariaLabel="delete-icon"
                                      variant="plain"
                                      className="group relative"
                                      isDisabled={!isAllowed}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        e.preventDefault();
                                        handlePopUpOpen("removeRole", index);
                                      }}
                                    >
                                      <FontAwesomeIcon icon={faTrash} />
                                    </IconButton>
                                  )}
                                </OrgPermissionCan>
                                <IconButton
                                  ariaLabel="more-icon"
                                  variant="plain"
                                  className="group relative"
                                >
                                  <FontAwesomeIcon icon={faEllipsisV} />
                                </IconButton>
                              </div>
                            </Td>
                          </Tr>
                        );
                      })
                    ) : (
                      <Tr>
                        <Td colSpan={2}>
                          <EmptyState title="No roles assigned to template" icon={faUnlock} />
                        </Td>
                      </Tr>
                    )}
                  </TBody>
                </Table>
              </TableContainer>
            </div>
            <DeleteActionModal
              isOpen={popUp.removeRole.isOpen}
              deleteKey="remove"
              title={`Are you sure you want to remove the role ${
                roles[popUp?.removeRole?.data as number]?.slug
              }?`}
              onChange={(isOpen) => handlePopUpToggle("removeRole", isOpen)}
              onDeleteApproved={handleRemoveRole}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
