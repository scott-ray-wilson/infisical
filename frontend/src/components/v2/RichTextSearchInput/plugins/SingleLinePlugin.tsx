import { useEffect } from "react";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { COMMAND_PRIORITY_CRITICAL, INSERT_LINE_BREAK_COMMAND } from "lexical";

export const SingleLinePlugin = () => {
  const [editor] = useLexicalComposerContext();
  useEffect(() => {
    return editor.registerCommand(
      INSERT_LINE_BREAK_COMMAND,
      () => {
        // prevent new line from being inserted
        return true;
      },
      COMMAND_PRIORITY_CRITICAL
    );
  }, [editor]);

  return null;
};
