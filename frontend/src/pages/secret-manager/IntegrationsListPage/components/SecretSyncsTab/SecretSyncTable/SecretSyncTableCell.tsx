import { Td, Tooltip } from "@app/components/v2";

type Props = {
  primaryText: string;
  secondaryText: string;
};

export const SecretSyncTableCell = ({ primaryText, secondaryText }: Props) => {
  return (
    <Td className="!min-w-[8rem] max-w-0">
      <Tooltip
        side="left"
        className="max-w-2xl break-words"
        content={
          <>
            <p className="text-sm">{primaryText}</p>
            <p className="text-xs leading-3 text-bunker-300">{secondaryText}</p>
          </>
        }
      >
        <>
          <p className="truncate text-sm">{primaryText}</p>
          <p className="truncate text-xs leading-3 text-bunker-300">{secondaryText}</p>
        </>
      </Tooltip>
    </Td>
  );
};
