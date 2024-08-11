import { faCreditCard } from "@fortawesome/free-solid-svg-icons";
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
import { CreditCardRow } from "@app/views/UserSecretsPage/components/CreditCardRow";

type Props = {
  cards?: DecryptedConsumerSecret[];
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

export const CreditCardsTable = ({ cards = [], isLoading, handlePopUpOpen }: Props) => {
  return (
    <motion.div
      key="panel-credit-cards"
      transition={{ duration: 0.15 }}
      initial={{ opacity: 0, translateX: 30 }}
      animate={{ opacity: 1, translateX: 0 }}
      exit={{ opacity: 0, translateX: 30 }}
    >
      <TableContainer className="mt-4">
        <Table>
          <THead>
            <Tr>
              <Th>Card Name</Th>
              <Th>Card Number</Th>
              <Th>Security Code (CVV)</Th>
              <Th>Expires</Th>
              <Th className="w-5" />
            </Tr>
          </THead>
          <TBody>
            {isLoading && <TableSkeleton columns={4} innerKey="credit-cards" />}
            {!isLoading &&
              cards?.map((card) => {
                return (
                  <CreditCardRow
                    card={card}
                    handlePopUpOpen={handlePopUpOpen}
                    key={`login-credentials-${card.id}`}
                  />
                );
              })}
          </TBody>
        </Table>
        {cards?.length === 0 && <EmptyState title="No credit cards found" icon={faCreditCard} />}
      </TableContainer>
    </motion.div>
  );
};
