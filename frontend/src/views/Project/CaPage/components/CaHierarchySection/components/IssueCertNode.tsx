import { faArrowRightFromFile } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { Handle, Position } from "@xyflow/react";

import { IconButton } from "@app/components/v2";

export const IssueCertNode = () => {
  return (
    <>
      <Handle
        type="target"
        className="pointer-events-none !cursor-pointer opacity-0"
        position={Position.Top}
      />
      <IconButton ariaLabel="Issue certificate" colorSchema="secondary" variant="solid">
        <FontAwesomeIcon icon={faArrowRightFromFile} />
      </IconButton>
    </>
  );
};
