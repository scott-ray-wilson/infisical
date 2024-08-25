import { forwardRef } from "react";
import { BeautifulMentionsMenuItemProps } from "lexical-beautiful-mentions";

export const KeywordMenuItem = forwardRef<HTMLLIElement, BeautifulMentionsMenuItemProps>(
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

KeywordMenuItem.displayName = "CustomMenuItem";
