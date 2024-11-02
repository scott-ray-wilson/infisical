import { useState } from "react";
import { faClone, faEllipsis, faMagnifyingGlass } from "@fortawesome/free-solid-svg-icons";
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
  Tr
} from "@app/components/v2";
import { useListProjectTemplates } from "@app/hooks/api/projectTemplates";

export const ProjectTemplatesTable = () => {
  const { isLoading, data: projectTemplates = [] } = useListProjectTemplates();
  const [search, setSearch] = useState("");
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
              <Th>Roles</Th>
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
            {projectTemplates?.map((template) => (
              <Tr key={template.id}>
                <Td>{template.name}</Td>
                <Td>{template.roles.length}</Td>
                <Td>{template.environments.length}</Td>
                <Td>
                  <IconButton ariaLabel="Options menu">
                    <FontAwesomeIcon icon={faEllipsis} />
                  </IconButton>
                </Td>
              </Tr>
            ))}
            {projectTemplates?.length === 0 && (
              <Tr>
                <Td colSpan={5}>
                  <EmptyState title="No project templates found" icon={faClone} />
                </Td>
              </Tr>
            )}
          </TBody>
        </Table>
      </TableContainer>
    </div>
  );
};
