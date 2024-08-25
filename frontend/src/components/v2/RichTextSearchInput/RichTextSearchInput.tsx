import { useEffect, useState } from "react";
import { faMagnifyingGlass } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { LexicalComposer } from "@lexical/react/LexicalComposer";
import { ContentEditable } from "@lexical/react/LexicalContentEditable";
import { LexicalErrorBoundary } from "@lexical/react/LexicalErrorBoundary";
import { OnChangePlugin } from "@lexical/react/LexicalOnChangePlugin";
import { PlainTextPlugin } from "@lexical/react/LexicalPlainTextPlugin";
import { cva, VariantProps } from "cva";
import { $getRoot, $nodesOfType, EditorState } from "lexical";
import {
  BeautifulMentionNode,
  BeautifulMentionsItem,
  BeautifulMentionsPlugin,
  BeautifulMentionsTheme
} from "lexical-beautiful-mentions";

import { createNotification } from "@app/components/notifications";
import { useDebounce } from "@app/hooks";

import { KeywordEmptyResults, KeywordMenu, KeywordMenuItem } from "./components";
import { SingleLinePlugin } from "./plugins";

type KeywordItems = Record<string, BeautifulMentionsItem[]>;

type Props<T extends KeywordItems> = {
  namespace: string;
  keywordItems: T;
  keywordsTheme: BeautifulMentionsTheme;
  className?: string;
  placeholder?: string;
  isFullWidth?: boolean;
  onChange: (textFilter: string[], keywordFilters: T) => void;
};

const searchInputVariants = cva(
  "input w-full pl-10 min-w-[20rem] py-[0.375rem] text-gray-400 outline-none focus:ring-2 hover:ring-bunker-400/60 duration-100",
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

const placeholderVariants = cva("text-gray-400 absolute left-10 pointer-events-none", {
  variants: {
    size: {
      xs: ["text-xs"],
      sm: ["text-sm"],
      md: ["text-md"],
      lg: ["text-lg"]
    }
  }
});

const searchInputParentContainerVariants = cva(
  "inline-flex font-inter items-center border relative",
  {
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
  }
);

export type RichTextSearchInputProps<T extends KeywordItems> = Props<T> &
  VariantProps<typeof searchInputVariants>;

export type RichTextSearchInputType = typeof RichTextSearchInput;

export function RichTextSearchInput<T extends KeywordItems>({
  namespace,
  keywordItems,
  keywordsTheme,
  className,
  onChange,
  isError = false,
  isRounded = true,
  variant = "filled",
  isFullWidth,
  size = "sm",
  placeholder = "Search..."
}: RichTextSearchInputProps<T>) {
  const [editorState, setEditorState] = useState<EditorState | null>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const debouncedEditorState = useDebounce(editorState, 300);

  const handleMenuOpenChange = (isOpen: boolean) => () => {
    setIsMenuOpen(isOpen);
  };

  const handleError = (error: Error) => {
    console.error(error);
    createNotification({ text: error.message, type: "error" });
  };

  useEffect(() => {
    // don't filter if no editor state or user is typing keyword
    if (!debouncedEditorState || isMenuOpen) return;

    debouncedEditorState.read(() => {
      const textFilter = $getRoot()
        .getAllTextNodes()
        .map((node) => node.getTextContent().trim());
      const keywordNodes = $nodesOfType(BeautifulMentionNode);

      const keywordFilters: KeywordItems = {};

      // initialize keyword filters
      Object.keys(keywordItems).forEach((key) => {
        keywordFilters[key] = [];
      });

      // populate filter with referenced keyword data
      keywordNodes.forEach((node) => {
        keywordFilters[node.getTrigger()].push({
          value: node.getValue(),
          ...node.getData()
        });
      });

      onChange(textFilter, keywordFilters as T);
    });
  }, [debouncedEditorState]);

  return (
    <div
      className={searchInputParentContainerVariants({
        className,
        isRounded,
        isError,
        isFullWidth,
        variant
      })}
    >
      <span className="absolute left-0 ml-3 text-sm">
        <FontAwesomeIcon icon={faMagnifyingGlass} />
      </span>
      <LexicalComposer
        initialConfig={{
          namespace,
          nodes: [BeautifulMentionNode],
          theme: {
            beautifulMentions: keywordsTheme
          },
          onError: handleError
        }}
      >
        <PlainTextPlugin
          contentEditable={
            <ContentEditable
              className={searchInputVariants({
                isError,
                size,
                isRounded,
                variant
              })}
            />
          }
          placeholder={<div className={placeholderVariants({ size })}>{placeholder}</div>}
          ErrorBoundary={LexicalErrorBoundary}
        />
        <BeautifulMentionsPlugin
          items={keywordItems}
          emptyComponent={KeywordEmptyResults}
          menuItemComponent={KeywordMenuItem}
          menuComponent={KeywordMenu}
          onMenuOpen={handleMenuOpenChange(true)}
          onMenuClose={handleMenuOpenChange(false)}
        />
        <SingleLinePlugin />
        <OnChangePlugin onChange={setEditorState} />
      </LexicalComposer>
    </div>
  );
}
