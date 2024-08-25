import { faFilterCircleXmark } from "@fortawesome/free-solid-svg-icons";
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
        className={`absolute right-2 top-[0.6rem] text-sm ${
          isEmpty ? "pointer-events-none opacity-0" : ""
        } transition-opacity duration-200`}
        onClick={handleClear}
        ariaLabel="Clear filters"
        colorSchema="secondary"
        variant="plain"
      >
        <FontAwesomeIcon icon={faFilterCircleXmark} />
      </IconButton>

      <ClearEditorPlugin />
    </>
  );
};
