import { useCallback } from "react";
import { faCheck, faCopy, faEllipsisV, faWarning } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { format } from "date-fns";
import { twMerge } from "tailwind-merge";

import { createNotification } from "@app/components/notifications";
import {
  Badge,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  IconButton,
  Td,
  Tooltip,
  Tr
} from "@app/components/v2";
import { SECRET_SCANNING_DATA_SOURCE_MAP } from "@app/helpers/secretScanningV2";
import { useToggle } from "@app/hooks";
import {
  SecretScanningFindingStatus,
  TSecretScanningFinding
} from "@app/hooks/api/secretScanningV2";

type Props = {
  finding: TSecretScanningFinding;
};

export const SecretScanningFindingRow = ({ finding }: Props) => {
  const { resourceName, id, dataSourceType, createdAt, resourceType, rule, status } = finding;

  const [isIdCopied, setIsIdCopied] = useToggle(false);

  const handleCopyId = useCallback(
    (idToCopy: string) => {
      setIsIdCopied.on();
      navigator.clipboard.writeText(idToCopy);

      createNotification({
        text: "Resource ID copied to clipboard",
        type: "info"
      });

      const timer = setTimeout(() => setIsIdCopied.off(), 2000);

      // eslint-disable-next-line consistent-return
      return () => clearTimeout(timer);
    },
    [isIdCopied]
  );

  const sourceDetails = SECRET_SCANNING_DATA_SOURCE_MAP[dataSourceType];

  return (
    <Tr
      className={twMerge("group h-10 transition-colors duration-100 hover:bg-mineshaft-700")}
      key={`resource-${id}`}
    >
      <Td className="!min-w-[4rem] max-w-0">
        <div className="flex w-full items-center">
          <img
            alt={`${sourceDetails.name} Data Source`}
            src={`/images/integrations/${sourceDetails.image}`}
            className="w-5"
          />
          <p className="ml-2 truncate">{sourceDetails.name}</p>
        </div>
      </Td>
      <Td>
        <div className="flex items-center gap-2">
          <p>{format(createdAt, "MMM dd yyyy")}</p>
          <p className="text-mineshaft-400">{format(createdAt, "HH:mm aa")}</p>
        </div>
      </Td>
      <Td className="!min-w-[8rem] max-w-0">
        <div className="w-full items-center">
          <p className="truncate">{resourceName}</p>
          <p className="truncate text-xs text-mineshaft-400">{resourceType}</p>
        </div>
      </Td>
      <Td>{rule}</Td>
      <Td className="whitespace-nowrap">
        {status === SecretScanningFindingStatus.Unresolved ? (
          <Badge
            variant="primary"
            className="flex h-5 w-min items-center gap-1.5 whitespace-nowrap"
          >
            <FontAwesomeIcon icon={faWarning} />
            <span>Unresolved</span>
          </Badge>
        ) : (
          <Badge
            variant="success"
            className="flex h-5 w-min items-center gap-1.5 whitespace-nowrap"
          >
            <FontAwesomeIcon icon={faCheck} />
            Resolved
          </Badge>
        )}
      </Td>
      <Td>
        <Tooltip className="max-w-sm text-center" content="Options">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <IconButton
                ariaLabel="Options"
                colorSchema="secondary"
                className="w-6"
                variant="plain"
              >
                <FontAwesomeIcon icon={faEllipsisV} />
              </IconButton>
            </DropdownMenuTrigger>
            <DropdownMenuContent sideOffset={2} align="end">
              <DropdownMenuItem
                icon={<FontAwesomeIcon icon={isIdCopied ? faCheck : faCopy} />}
                onClick={(e) => {
                  e.stopPropagation();
                  handleCopyId(id);
                }}
              >
                Copy Finding ID
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </Tooltip>
      </Td>
    </Tr>
  );
};
