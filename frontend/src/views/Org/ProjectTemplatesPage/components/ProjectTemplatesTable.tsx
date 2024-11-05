import { useMemo, useState } from "react";
import { useRouter } from "next/router";
import {
  faCircleInfo,
  faClone,
  faMagnifyingGlass,
  faTrash
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

import {
  EmptyState,
  IconButton,
  Input,
  Table,
  TableContainer,
  TableSkeleton,
  TBody,
  Td,
  Th,
  THead,
  Tooltip,
  Tr
} from "@app/components/v2";
import { useOrganization } from "@app/context";
import { usePopUp } from "@app/hooks";
import { useListProjectTemplates } from "@app/hooks/api/projectTemplates";
import { DeleteProjectTemplateModal } from "@app/views/Org/ProjectTemplatesPage/components/DeleteProjectTemplateModal";

export const ProjectTemplatesTable = () => {
  const { isLoading, data: projectTemplates = [] } = useListProjectTemplates();
  const [search, setSearch] = useState("");
  const router = useRouter();
  const { currentOrg } = useOrganization();

  const { popUp, handlePopUpOpen, handlePopUpToggle } = usePopUp(["deleteTemplate"] as const);

  const filteredTemplates = useMemo(
    () =>
      projectTemplates?.filter((template) =>
        template.name.toLowerCase().includes(search.toLowerCase().trim())
      ) ?? [],
    [search, projectTemplates]
  );

  return (
    <div>
      <Input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        leftIcon={<FontAwesomeIcon icon={faMagnifyingGlass} />}
        placeholder="Search templates..."
      />
      <TableContainer className="mt-4">
        <Table>
          <THead>
            <Tr>
              <Th>Name</Th>
              <Th>Custom Roles</Th>
              <Th>Environments</Th>
              <Th />
            </Tr>
          </THead>
          <TBody>
            {isLoading && (
              <TableSkeleton
                innerKey="project-templates-table"
                columns={4}
                key="project-templates"
              />
            )}
            {filteredTemplates.map((template) => {
              const { id, name, roles, environments, description } = template;
              return (
                <Tr
                  onClick={() => router.push(`/org/${currentOrg?.id}/project-templates/${id}`)}
                  className="cursor-pointer hover:bg-mineshaft-700"
                  key={id}
                >
                  <Td>
                    {name}
                    {description && (
                      <Tooltip content={description}>
                        <FontAwesomeIcon
                          size="sm"
                          className="ml-2 text-mineshaft-400"
                          icon={faCircleInfo}
                        />
                      </Tooltip>
                    )}
                  </Td>
                  <Td className="pl-16">
                    {roles.length}
                    {roles.length > 0 && (
                      <Tooltip
                        content={
                          <ul className="ml-2 list-disc">
                            {roles.map((role) => (
                              <li key={role.name}>{role.name}</li>
                            ))}
                          </ul>
                        }
                      >
                        <FontAwesomeIcon
                          size="sm"
                          className="ml-2 text-mineshaft-400"
                          icon={faCircleInfo}
                        />
                      </Tooltip>
                    )}
                  </Td>
                  <Td className="pl-14">
                    {environments.length}
                    {environments.length > 0 && (
                      <Tooltip
                        content={
                          <ul className="ml-2 list-disc">
                            {environments
                              .sort((a, b) => (a.position > b.position ? 1 : -1))
                              .map((env) => (
                                <li key={env.slug}>{env.name}</li>
                              ))}
                          </ul>
                        }
                      >
                        <FontAwesomeIcon
                          size="sm"
                          className="ml-2 text-mineshaft-400"
                          icon={faCircleInfo}
                        />
                      </Tooltip>
                    )}
                  </Td>
                  <Td className="w-5">
                    <IconButton
                      onClick={(e) => {
                        e.stopPropagation();
                        handlePopUpOpen("deleteTemplate", template);
                      }}
                      variant="plain"
                      colorSchema="danger"
                      ariaLabel="Delete template"
                    >
                      <FontAwesomeIcon icon={faTrash} />
                    </IconButton>
                  </Td>
                </Tr>
              );
            })}
            {filteredTemplates?.length === 0 && (
              <Tr>
                <Td colSpan={5}>
                  <EmptyState
                    title={
                      search.trim()
                        ? "No project templates match search"
                        : "No project templates found"
                    }
                    icon={faClone}
                  />
                </Td>
              </Tr>
            )}
          </TBody>
        </Table>
      </TableContainer>
      <DeleteProjectTemplateModal
        isOpen={popUp.deleteTemplate.isOpen}
        onOpenChange={(isOpen) => handlePopUpToggle("deleteTemplate", isOpen)}
        template={popUp.deleteTemplate.data}
      />
    </div>
  );
};