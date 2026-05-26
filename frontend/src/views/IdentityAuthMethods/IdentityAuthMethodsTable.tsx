import { useState } from "react";
import { LockIcon } from "lucide-react";

import {
  Badge,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Tooltip,
  TooltipContent,
  TooltipTrigger
} from "@app/components/v3";
import { IdentityAuthMethod, identityAuthToNameMap } from "@app/hooks/api";

import { IdentityAuthMethodSheet } from "./IdentityAuthMethodSheet";

type Props = {
  identityId: string;
  identityName: string;
  authMethods: IdentityAuthMethod[];
  activeLockoutAuthMethods: IdentityAuthMethod[];
  onMutated: () => void;
};

export const IdentityAuthMethodsTable = ({
  identityId,
  identityName,
  authMethods,
  activeLockoutAuthMethods,
  onMutated
}: Props) => {
  const [selectedAuthMethod, setSelectedAuthMethod] = useState<IdentityAuthMethod | null>(null);

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Auth Method</TableHead>
            <TableHead className="w-5" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {authMethods.map((authMethod) => {
            const isLockedOut = activeLockoutAuthMethods?.includes(authMethod);
            return (
              <TableRow
                key={authMethod}
                className="cursor-pointer"
                onClick={() => setSelectedAuthMethod(authMethod)}
              >
                <TableCell>
                  <div className="flex items-center gap-2">
                    {identityAuthToNameMap[authMethod]}
                    {isLockedOut && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Badge isSquare variant="danger">
                            <LockIcon />
                          </Badge>
                        </TooltipTrigger>
                        <TooltipContent>Auth method has active lockouts</TooltipContent>
                      </Tooltip>
                    )}
                  </div>
                </TableCell>
                <TableCell />
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
      {selectedAuthMethod && (
        <IdentityAuthMethodSheet
          open={selectedAuthMethod !== null}
          onOpenChange={(open) => {
            if (!open) setSelectedAuthMethod(null);
          }}
          identityId={identityId}
          identityName={identityName}
          authMethod={selectedAuthMethod}
          allAuthMethods={authMethods}
          isLockedOut={activeLockoutAuthMethods?.includes(selectedAuthMethod) ?? false}
          onMutated={onMutated}
        />
      )}
    </>
  );
};
