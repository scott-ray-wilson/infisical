import { BeautifulMentionsTheme } from "lexical-beautiful-mentions";

import { DynamicRichTextSearchInput } from "@app/components/v2";
import { RichTextSearchInputProps } from "@app/components/v2/RichTextSearchInput/RichTextSearchInput";
import { CaStatus, CaType } from "@app/hooks/api";
import { TCertificateAuthority } from "@app/hooks/api/ca/types";

type Props = {
  cas: TCertificateAuthority[];
  onSearch: (cas: TCertificateAuthority[]) => void;
  className?: string;
};

type CaKeywordTrigger = "status:" | "type:" | "is:";

const caKeywordItems: Record<CaKeywordTrigger, { id: string; value: string }[]> = {
  "status:": Object.values(CaStatus).map((status) => ({
    value: status.replace("-", " "),
    id: status
  })),
  "type:": Object.values(CaType).map((type) => ({
    value: type.replace("-", " "),
    id: type
  })),
  "is:": [{ value: "expired", id: "expired" }]
};

const baseStatusContainerStyle =
  "rounded-md px-1.5 pb-[0.03rem] pt-[0.04rem] opacity-80 data-[beautiful-mention='status:disabled']:bg-red/20 data-[beautiful-mention='status:disabled']:text-red data-[beautiful-mention='status:active']:bg-green/20 data-[beautiful-mention='status:active']:text-green data-[beautiful-mention='status:pending_certificate']:bg-yellow/20 data-[beautiful-mention='status:pending_certificate']:text-yellow";

const baseTypeContainerStyle =
  "rounded-md px-1.5 pb-[0.03rem] pt-[0.04rem] opacity-80 bg-primary-400/20 text-primary-400";

const caKeywordsTheme: BeautifulMentionsTheme = {
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

export const CaSearchInput = ({ className, cas, onSearch }: Props) => {
  const handleFilter: RichTextSearchInputProps<typeof caKeywordItems>["onChange"] = (
    textFilter,
    keywordFilters
  ) => {
    const statusFilter = keywordFilters["status:"];
    const typeFilter = keywordFilters["type:"];

    const filteredCas = cas.filter((ca) => {
      return (
        // all text should be present
        textFilter.every((segment) =>
          ca.friendlyName.toLowerCase().trim().includes(segment.toLowerCase())
        ) &&
        // match one (user can pass multiple)
        (statusFilter.length === 0 || statusFilter.some((status) => status.id === ca.status)) &&
        (typeFilter.length === 0 || typeFilter.some((type) => type.id === ca.type))
      );
    });

    onSearch(filteredCas);
  };

  return (
    <DynamicRichTextSearchInput
      isFullWidth
      className={className}
      namespace="CaSearchInput"
      keywordItems={caKeywordItems}
      keywordsTheme={caKeywordsTheme}
      onChange={handleFilter}
    />
  );
};
