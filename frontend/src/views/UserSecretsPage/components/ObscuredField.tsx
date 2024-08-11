import { useReducer } from "react";
import { faEye, faEyeSlash } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

import { IconButton } from "@app/components/v2";

type Props = {
  field: string;
};

const replaceContentWithDot = (str: string) => {
  let finalStr = "";
  for (let i = 0; i < str.length; i += 1) {
    const char = str.at(i);
    finalStr += char === "\n" ? "\n" : "*";
  }
  return finalStr;
};

export const ObscuredField = ({ field }: Props) => {
  const [showSecret, toggleShowSecret] = useReducer((show) => !show, false);

  return (
    <>
      <p className={`${showSecret ? "" : "truncate break-all"}`}>
        {showSecret ? field : replaceContentWithDot(field)}
      </p>
      <IconButton
        variant="outline_bg"
        colorSchema="primary"
        ariaLabel={showSecret ? "hide secret" : "show secret"}
        onClick={toggleShowSecret}
        className="mr-1 flex max-h-8 items-center rounded"
        size="xs"
      >
        <FontAwesomeIcon icon={showSecret ? faEyeSlash : faEye} />
      </IconButton>
    </>
  );
};
