import { forwardRef, useEffect, useState } from "react";
import { faMagnifyingGlass } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { LexicalComposer } from "@lexical/react/LexicalComposer";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { ContentEditable } from "@lexical/react/LexicalContentEditable";
import { LexicalErrorBoundary } from "@lexical/react/LexicalErrorBoundary";
import { OnChangePlugin } from "@lexical/react/LexicalOnChangePlugin";
import { PlainTextPlugin } from "@lexical/react/LexicalPlainTextPlugin";
import { cva } from "cva";
import {
  $getRoot,
  $nodesOfType,
  COMMAND_PRIORITY_CRITICAL,
  EditorState,
  INSERT_LINE_BREAK_COMMAND
} from "lexical";
import {
  BeautifulMentionNode,
  BeautifulMentionsMenuItemProps,
  BeautifulMentionsMenuProps,
  BeautifulMentionsPlugin,
  BeautifulMentionsTheme
} from "lexical-beautiful-mentions";

import { useDebounce } from "@app/hooks";
import { CaStatus, CaType } from "@app/hooks/api";
import { TCertificateAuthority } from "@app/hooks/api/ca/types";

type Props = {
  cas: TCertificateAuthority[];
  onSearch: (cas: TCertificateAuthority[]) => void;
  className?: string;
};

const inputVariants = cva(
  "input w-full pl-10 min-w-[20rem] py-[0.375rem] text-gray-400 placeholder:text-sm placeholder-mineshaft-50 outline-none focus:ring-2 hover:ring-bunker-400/60 duration-100",
  {
    variants: {
      size: {
        xs: ["text-xs"],
        sm: ["text-sm"],
        md: ["text-md"],
        lg: ["text-lg"]
      },
      isRounded: {
        true: ["rounded-md"],
        false: ""
      },
      variant: {
        filled: ["bg-mineshaft-800", "text-gray-400"],
        outline: ["bg-transparent"],
        plain: "bg-transparent outline-none"
      },
      isError: {
        true: "focus:ring-red/50 placeholder-red-300",
        false: "focus:ring-primary-400/50 focus:ring-1"
      }
    },
    compoundVariants: []
  }
);

const inputParentContainerVariants = cva("inline-flex font-inter items-center border relative", {
  variants: {
    isRounded: {
      true: ["rounded-md"],
      false: ""
    },
    isError: {
      true: "border-red",
      false: "border-mineshaft-500"
    },
    isFullWidth: {
      true: "w-full",
      false: ""
    },
    variant: {
      filled: ["bg-bunker-800", "text-gray-400"],
      outline: ["bg-transparent"],
      plain: "border-none"
    }
  }
});

function SingleLinePlugin() {
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
}

const mentionItems = {
  "status:": Object.values(CaStatus).map((status) => ({
    value: status.replace("-", " "),
    id: status
  })),
  "type:": Object.values(CaType).map((type) => ({
    value: type.replace("-", " "),
    id: type
  }))
};

const baseStatusContainerStyle =
  "rounded-md px-1.5 pb-[0.03rem] pt-[0.04rem] opacity-80 data-[beautiful-mention='status:disabled']:bg-red/20 data-[beautiful-mention='status:disabled']:text-red data-[beautiful-mention='status:active']:bg-green/20 data-[beautiful-mention='status:active']:text-green data-[beautiful-mention='status:pending_certificate']:bg-yellow/20 data-[beautiful-mention='status:pending_certificate']:text-yellow";

const baseTypeContainerStyle =
  "rounded-md px-1.5 pb-[0.03rem] pt-[0.04rem] opacity-80 bg-primary-400/20 text-primary-400";

const beautifulMentionsTheme: BeautifulMentionsTheme = {
  "type:": {
    trigger: "text-mineshaft-300",
    value: "capitalize",
    container: baseTypeContainerStyle,
    containerFocused: `${baseTypeContainerStyle} ring-primary-400/50 ring-1`
  },
  "status:": {
    trigger: "text-mineshaft-300",
    value: "capitalize",
    container: baseStatusContainerStyle,
    containerFocused: `${baseStatusContainerStyle} ring-primary-400/50 ring-1`
  }
};

function CustomMenu({ loading, ...props }: BeautifulMentionsMenuProps) {
  return (
    <ul
      className="min-w-[220px] rounded-md border border-mineshaft-600 bg-mineshaft-900 p-1 text-bunker-300 shadow will-change-auto"
      {...props}
    />
  );
}

function Empty() {
  return (
    <div className="min-w-[220px] rounded-md border border-mineshaft-600 bg-mineshaft-900 p-1 text-bunker-300 shadow will-change-auto">
      <span className="block cursor-pointer rounded-sm px-4 py-2 font-inter text-xs text-mineshaft-400 outline-none">
        No results match
      </span>
    </div>
  );
}

const CustomMenuItem = forwardRef<HTMLLIElement, BeautifulMentionsMenuItemProps>(
  ({ selected, item, itemValue, ...props }, ref) => (
    <li
      {...props}
      className={`block cursor-pointer rounded-sm px-4 py-2 font-inter text-xs capitalize text-mineshaft-200 outline-none ${
        selected ? "bg-mineshaft-700" : ""
      }`}
      ref={ref}
    />
  )
);

CustomMenuItem.displayName = "CustomMenuItem";

export const CaSearchBar = ({ className, cas, onSearch }: Props) => {
  const [editorState, setEditorState] = useState<EditorState | null>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const debouncedEditorState = useDebounce(editorState, 300);

  useEffect(() => {
    if (!debouncedEditorState || isMenuOpen) return;

    debouncedEditorState.read(() => {
      const keywordNodes = $nodesOfType(BeautifulMentionNode);
      const textNodes = $getRoot().getAllTextNodes();

      const filteredCas = cas.filter((ca) => {
        // TODO: fuzzy search
        return (
          textNodes.every((node) =>
            ca.friendlyName
              .toLowerCase()
              .trim()
              .includes(node.getTextContent().toLowerCase().trim())
          ) &&
          keywordNodes.every((keywordNode) => {
            switch (keywordNode.getTrigger()) {
              case "status:":
                return ca.status === keywordNode.getData()!.id;
              case "type:":
                return ca.type === keywordNode.getData()!.id;
              default:
                return false;
            }
          })
        );
      });

      onSearch(filteredCas);
    });
  }, [debouncedEditorState]);

  return (
    <div
      className={inputParentContainerVariants({
        className,
        isRounded: true,
        isError: false,
        isFullWidth: true,
        variant: "filled"
      })}
    >
      <span className="absolute left-0 ml-3 text-sm">
        <FontAwesomeIcon icon={faMagnifyingGlass} />
      </span>
      <LexicalComposer
        initialConfig={{
          namespace: "CaSearchBar",
          nodes: [BeautifulMentionNode],
          // nodes: [...createBeautifulMentionNode(CustomMentionComponent)],
          theme: {
            beautifulMentions: beautifulMentionsTheme
          },
          onError: (error) => console.error(error)
        }}
      >
        <PlainTextPlugin
          contentEditable={
            <ContentEditable
              className={inputVariants({
                isError: false,
                size: "sm",
                isRounded: true,
                variant: "filled"
              })}
            />
          }
          placeholder={
            <div className="pointer-events-none absolute top-1.5 left-10 text-sm">
              Search certificates...
            </div>
          }
          ErrorBoundary={LexicalErrorBoundary}
        />
        <BeautifulMentionsPlugin
          items={mentionItems}
          emptyComponent={Empty}
          menuItemComponent={CustomMenuItem}
          menuComponent={CustomMenu}
          onMenuOpen={() => setIsMenuOpen(true)}
          onMenuClose={() => setIsMenuOpen(false)}
        />
        <SingleLinePlugin />
        <OnChangePlugin onChange={setEditorState} />
      </LexicalComposer>
    </div>
  );
};
