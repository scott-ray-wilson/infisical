import { IconDefinition } from "@fortawesome/free-brands-svg-icons";
import { faAngleDown } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

import { Td } from "@app/components/v2";

type Props = {
  isRowExpanded?: boolean;
  name: string;
  icon: IconDefinition;
  iconClassName?: string;
  colWidth: number;
};

export const ResourceNameCell = ({ isRowExpanded, name, icon, iconClassName, colWidth }: Props) => {
  return (
    <Td
      className={`sticky left-0 z-10 bg-mineshaft-700 bg-clip-padding p-0 group-hover:bg-mineshaft-600 ${
        isRowExpanded && "border-t-2 border-mineshaft-500"
      }`}
      style={{
        width: colWidth
      }}
    >
      <div
        style={{
          width: colWidth
        }}
        className="flex h-full items-center space-x-5 border-r border-mineshaft-600 px-4 py-2.5"
      >
        <div className="w-5 min-w-5">
          <FontAwesomeIcon className={iconClassName} icon={isRowExpanded ? faAngleDown : icon} />
        </div>
        <span className="truncate">{name}</span>
      </div>
    </Td>
  );
};
