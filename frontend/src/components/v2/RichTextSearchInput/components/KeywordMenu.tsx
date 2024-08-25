import { BeautifulMentionsMenuProps } from "lexical-beautiful-mentions";

export const KeywordMenu = ({ loading, ...props }: BeautifulMentionsMenuProps) => {
  return (
    <ul
      className="min-w-[220px] rounded-md border border-mineshaft-600 bg-mineshaft-900 p-1 text-bunker-300 shadow will-change-auto"
      {...props}
    />
  );
};
