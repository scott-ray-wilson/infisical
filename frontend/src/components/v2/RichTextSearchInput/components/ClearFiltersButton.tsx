import { faXmarkCircle } from "@fortawesome/free-regular-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { ClearEditorPlugin } from "@lexical/react/LexicalClearEditorPlugin";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { useLexicalIsTextContentEmpty } from "@lexical/react/useLexicalIsTextContentEmpty";
import { CLEAR_EDITOR_COMMAND } from "lexical";

import { IconButton } from "../../IconButton";

export const ClearFiltersButton = () => {
  const [editor] = useLexicalComposerContext();

  const handleClear = () => {
    editor.dispatchCommand(CLEAR_EDITOR_COMMAND, undefined);
  };

  const isEmpty = useLexicalIsTextContentEmpty(editor, true);

  return (
    <>
      <IconButton
        className={`absolute right-0 mr-2 text-sm ${
          isEmpty ? "pointer-events-none opacity-0" : ""
        } transition-opacity duration-200`}
        onClick={handleClear}
        ariaLabel="Clear filters"
        colorSchema="secondary"
        variant="plain"
      >
        <FontAwesomeIcon icon={faXmarkCircle} />
      </IconButton>

      <ClearEditorPlugin />
    </>
  );
};
