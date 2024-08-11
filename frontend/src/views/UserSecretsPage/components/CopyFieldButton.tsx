import { useEffect } from "react";
import { faCheck, faCopy } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

import { IconButton } from "@app/components/v2";
import { useTimedReset } from "@app/hooks";

export const CopyFieldButton = ({ field }: { field: string }) => {
  const [isCopied, , setIsCopied] = useTimedReset<boolean>({
    initialState: false
  });

  useEffect(() => {
    if (isCopied) {
      setTimeout(() => setIsCopied(false), 2000);
    }
  }, [isCopied]);

  const copyUrlToClipboard = () => {
    navigator.clipboard.writeText(field);
    setIsCopied(true);
  };

  return (
    <IconButton
      variant="outline_bg"
      colorSchema="primary"
      ariaLabel="copy to clipboard"
      onClick={copyUrlToClipboard}
      className="mr-1 flex max-h-8 items-center rounded"
      size="xs"
    >
      <FontAwesomeIcon icon={isCopied ? faCheck : faCopy} />
    </IconButton>
  );
};
