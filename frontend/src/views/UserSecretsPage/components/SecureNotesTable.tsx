import { faStickyNote } from "@fortawesome/free-solid-svg-icons";
import { motion } from "framer-motion";

import {
  EmptyState,
  Table,
  TableContainer,
  TableSkeleton,
  TBody,
  Th,
  THead,
  Tr
} from "@app/components/v2";
import { DecryptedConsumerSecret } from "@app/hooks/api/consumer-secrets/types";
import { UsePopUpState } from "@app/hooks/usePopUp";
import { SecureNoteRow } from "@app/views/UserSecretsPage/components/SecureNoteRow";

type Props = {
  notes?: DecryptedConsumerSecret[];
  isLoading?: boolean;
  handlePopUpOpen: (
    popUpName: keyof UsePopUpState<["deleteConsumerSecretConfirmation", "updateConsumerSecret"]>,
    {
      name,
      id
    }: {
      name: string;
      id: string;
    }
  ) => void;
};

export const SecureNotesTable = ({ notes = [], isLoading, handlePopUpOpen }: Props) => {
  return (
    <motion.div
      key="panel-secure-notes"
      transition={{ duration: 0.15 }}
      initial={{ opacity: 0, translateX: 30 }}
      animate={{ opacity: 1, translateX: 0 }}
      exit={{ opacity: 0, translateX: 30 }}
    >
      <TableContainer className="mt-4">
        <Table>
          <THead>
            <Tr>
              <Th>Title</Th>
              <Th>Content</Th>
              <Th className="w-5" />
            </Tr>
          </THead>
          <TBody>
            {isLoading && <TableSkeleton columns={4} innerKey="credit-cards" />}
            {!isLoading &&
              notes?.map((note) => {
                return (
                  <SecureNoteRow
                    note={note}
                    handlePopUpOpen={handlePopUpOpen}
                    key={`secure-note-${note.id}`}
                  />
                );
              })}
          </TBody>
        </Table>
        {notes?.length === 0 && <EmptyState title="No notes found" icon={faStickyNote} />}
      </TableContainer>
    </motion.div>
  );
};
