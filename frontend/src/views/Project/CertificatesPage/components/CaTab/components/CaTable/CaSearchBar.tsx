import { forwardRef, useEffect } from "react";
import { faMagnifyingGlass } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { LexicalComposer } from "@lexical/react/LexicalComposer";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { ContentEditable } from "@lexical/react/LexicalContentEditable";
import { LexicalErrorBoundary } from "@lexical/react/LexicalErrorBoundary";
import { PlainTextPlugin } from "@lexical/react/LexicalPlainTextPlugin";
import { cva } from "cva";
import { COMMAND_PRIORITY_CRITICAL, INSERT_LINE_BREAK_COMMAND } from "lexical";
import {
  BeautifulMentionNode,
  BeautifulMentionsMenuItemProps,
  BeautifulMentionsMenuProps,
  BeautifulMentionsPlugin,
  BeautifulMentionsTheme
} from "lexical-beautiful-mentions";

import { CaStatus } from "@app/hooks/api";

type Props = {
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

function SingleLinePlugin({ onEnter }: { onEnter?: () => void }) {
  const [editor] = useLexicalComposerContext();
  useEffect(() => {
    return editor.registerCommand(
      INSERT_LINE_BREAK_COMMAND,
      () => {
        // handle submit
        if (onEnter) onEnter();

        // prevent new line from being inserted
        return true;
      },
      COMMAND_PRIORITY_CRITICAL
    );
  }, [editor, onEnter]);

  return null;
}

const mentionItems = {
  "status:": Object.values(CaStatus).map((status) => ({
    value: status.replace("-", " "),
    id: status
  }))
};

const beautifulMentionsTheme: BeautifulMentionsTheme = {
  // 👇 use the trigger name as the key
  "@": "px-1 mx-px ...",
  // 👇 add the "Focused" suffix to style the focused mention
  "@Focused": "outline-none shadow-md ...",
  // 👇 use a class configuration object for advanced styling
  "status:": {
    trigger: "text-gray-100/75",
    // value: "",
    value: "capitalize",
    container:
      "rounded-md px-1.5 pb-[0.03rem] opacity-80 text-opacity-80 hover:opacity-100 pt-[0.04rem] data-[beautiful-mention='status:disabled']:bg-red/20 data-[beautiful-mention='status:disabled']:text-red data-[beautiful-mention='status:active']:bg-green/20 data-[beautiful-mention='status:active']:text-green data-[beautiful-mention='status:pending_certificate']:bg-yellow/20 data-[beautiful-mention='status:pending_certificate']:text-yellow",
    containerFocused:
      "rounded-md px-1.5 pb-[0.03rem] opacity-100 pt-[0.04rem] data-[beautiful-mention='status:disabled']:bg-red/20 data-[beautiful-mention='status:disabled']:text-red data-[beautiful-mention='status:active']:bg-green/20 data-[beautiful-mention='status:active']:text-green data-[beautiful-mention='status:pending_certificate']:bg-yellow/20 data-[beautiful-mention='status:pending_certificate']:text-yellow"
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

export const CaSearchBar = ({ className }: Props) => {
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
          menuItemComponent={CustomMenuItem}
          menuComponent={CustomMenu}
        />
        <SingleLinePlugin />
      </LexicalComposer>
    </div>
  );
};
