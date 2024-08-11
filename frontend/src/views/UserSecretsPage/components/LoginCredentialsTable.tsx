import { faKey } from "@fortawesome/free-solid-svg-icons";
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
import { LoginCredentialsRow } from "@app/views/UserSecretsPage/components/LoginCredentialsRow";

type Props = {
  credentials?: DecryptedConsumerSecret[];
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

export const LoginCredentialsTable = ({ credentials = [], isLoading, handlePopUpOpen }: Props) => {
  return (
    <motion.div
      key="panel-login-credentials"
      transition={{ duration: 0.15 }}
      initial={{ opacity: 0, translateX: 30 }}
      animate={{ opacity: 1, translateX: 0 }}
      exit={{ opacity: 0, translateX: 30 }}
    >
      <TableContainer className="mt-4">
        <Table>
          <THead>
            <Tr>
              <Th>Name</Th>
              <Th>Username</Th>
              <Th>Password</Th>
              <Th className="w-5" />
            </Tr>
          </THead>
          <TBody>
            {isLoading && <TableSkeleton columns={4} innerKey="login-credentials" />}
            {!isLoading &&
              credentials?.map((loginCredentials) => {
                return (
                  <LoginCredentialsRow
                    credentials={loginCredentials}
                    handlePopUpOpen={handlePopUpOpen}
                    key={`login-credentials-${loginCredentials.id}`}
                  />
                );
              })}
          </TBody>
        </Table>
        {credentials?.length === 0 && (
          <EmptyState title="No login credentials found" icon={faKey} />
        )}
      </TableContainer>
    </motion.div>
  );
};
