import { faMagnifyingGlass } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { LexicalComposer } from "@lexical/react/LexicalComposer";
import { ContentEditable } from "@lexical/react/LexicalContentEditable";
import { LexicalErrorBoundary } from "@lexical/react/LexicalErrorBoundary";
import { RichTextPlugin } from "@lexical/react/LexicalRichTextPlugin";
import { cva } from "cva";

const inputVariants = cva(
  "input w-full min-w-[20rem] py-[0.375rem] text-gray-400 placeholder:text-sm placeholder-mineshaft-50 outline-none focus:ring-2 hover:ring-bunker-400/60 duration-100",
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

export const CaSearchBar = () => {
  return (
    <div
      className={inputParentContainerVariants({
        isRounded: true,
        isError: false,
        isFullWidth: false,
        variant: "filled"
      })}
    >
      <span className="absolute left-0 ml-3 text-sm">
        <FontAwesomeIcon icon={faMagnifyingGlass} />
      </span>
      <LexicalComposer
        initialConfig={{
          namespace: "CaSearchBar",
          onError: (error) => console.error(error)
        }}
      >
        <RichTextPlugin
          contentEditable={
            <ContentEditable
              className={inputVariants({
                className: "pl-10",
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
      </LexicalComposer>
    </div>
  );
};
