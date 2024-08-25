import { isAfter, isBefore } from "date-fns";
import { BeautifulMentionsTheme } from "lexical-beautiful-mentions";
import { twMerge } from "tailwind-merge";

import { DynamicRichTextSearchInput } from "@app/components/v2";
import { RichTextSearchInputProps } from "@app/components/v2/RichTextSearchInput/RichTextSearchInput";
import { CaStatus, CaType } from "@app/hooks/api";
import { TCertificateAuthority } from "@app/hooks/api/ca/types";

type Props = {
  cas: TCertificateAuthority[];
  onFilter: (cas: TCertificateAuthority[]) => void;
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
  "is:": [
    { value: "valid", id: "valid" },
    { value: "invalid", id: "invalid" }
  ]
};

const baseContainerStyle = "rounded-md px-1.5 pb-[0.03rem] pt-[0.04rem] opacity-80";

const baseContainerFocusedStyle = "ring-primary-400/50 ring-1";

const baseStatusContainerStyle =
  "data-[beautiful-mention='status:disabled']:bg-red/20 data-[beautiful-mention='status:disabled']:text-red data-[beautiful-mention='status:active']:bg-green/20 data-[beautiful-mention='status:active']:text-green data-[beautiful-mention='status:pending_certificate']:bg-yellow/20 data-[beautiful-mention='status:pending_certificate']:text-yellow";

const baseTypeContainerStyle = "bg-primary-400/20 text-primary-400";

const baseIsContainerStyle =
  "data-[beautiful-mention='is:invalid']:bg-bunker-200/20 data-[beautiful-mention='is:invalid']:text-red data-[beautiful-mention='is:valid']:bg-bunker-200/20  data-[beautiful-mention='is:valid']:text-green";

const caKeywordsTheme: BeautifulMentionsTheme = {
  "type:": {
    trigger: "text-mineshaft-300",
    value: "capitalize",
    container: twMerge(baseTypeContainerStyle, baseContainerStyle),
    containerFocused: twMerge(baseTypeContainerStyle, baseContainerStyle, baseContainerFocusedStyle)
  },
  "status:": {
    trigger: "text-mineshaft-300",
    value: "capitalize",
    container: twMerge(baseStatusContainerStyle, baseContainerStyle),
    containerFocused: twMerge(
      baseStatusContainerStyle,
      baseContainerStyle,
      baseContainerFocusedStyle
    )
  },
  "is:": {
    trigger: "text-mineshaft-300",
    value: "capitalize",
    container: twMerge(baseIsContainerStyle, baseContainerStyle),
    containerFocused: twMerge(baseIsContainerStyle, baseContainerStyle, baseContainerFocusedStyle)
  }
};

export const CaSearchInput = ({ className, cas, onFilter }: Props) => {
  const handleFilter: RichTextSearchInputProps<typeof caKeywordItems>["onChange"] = (
    textFilter,
    keywordFilters
  ) => {
    const statusFilter = keywordFilters["status:"];
    const typeFilter = keywordFilters["type:"];
    const isFilter = keywordFilters["is:"];

    const filteredCas = cas.filter((ca) => {
      return (
        // all text should be present
        textFilter.every((segment) =>
          ca.friendlyName.toLowerCase().trim().includes(segment.toLowerCase())
        ) &&
        // match one (user can pass multiple)
        (statusFilter.length === 0 || statusFilter.some((status) => status.id === ca.status)) &&
        (typeFilter.length === 0 || typeFilter.some((type) => type.id === ca.type)) &&
        (isFilter.length === 0 ||
          isFilter.some((condition) => {
            const { notAfter, notBefore } = ca;
            const today = Date.now();

            switch (condition.id) {
              case "valid":
                return (
                  !!notAfter &&
                  !!notBefore &&
                  !(isAfter(today, new Date(notAfter)) || isBefore(today, new Date(notBefore)))
                );
              case "invalid":
                return (
                  !notAfter ||
                  !notBefore ||
                  isAfter(today, new Date(notAfter)) ||
                  isBefore(today, new Date(notBefore))
                );
              default:
                return false;
            }
          }))
      );
    });

    onFilter(filteredCas);
  };

  return (
    <DynamicRichTextSearchInput
      isFullWidth
      className={className}
      namespace="CaSearchInput"
      keywordItems={caKeywordItems}
      keywordsTheme={caKeywordsTheme}
      onChange={handleFilter}
      placeholder="Filter by text or keywords..."
    />
  );
};
