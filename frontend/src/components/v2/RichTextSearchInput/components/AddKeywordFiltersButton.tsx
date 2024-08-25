import { Fragment, ReactEventHandler } from "react";
import { faCheckCircle, faCircle } from "@fortawesome/free-regular-svg-icons";
import { faFilter } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { BeautifulMentionsItem, useBeautifulMentions } from "lexical-beautiful-mentions";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger
} from "../../Dropdown";
import { IconButton } from "../../IconButton";

type Props = {
  keywordItems: Record<string, BeautifulMentionsItem[]>;
};

export const AddFiltersButton = ({ keywordItems }: Props) => {
  const { removeMentions, insertMention, hasMentions } = useBeautifulMentions();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <IconButton
          ariaLabel="Add filter"
          variant="outline_bg"
          size="sm"
          className="rounded-r-none bg-mineshaft-600"
        >
          <FontAwesomeIcon icon={faFilter} />
        </IconButton>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        <DropdownMenuLabel>Filter by keywords</DropdownMenuLabel>
        {Object.entries(keywordItems).map(([trigger, keywords]) => {
          return (
            <Fragment key={trigger}>
              <DropdownMenuGroup>{trigger}</DropdownMenuGroup>
              {keywords.map((keyword) => {
                const value = typeof keyword === "string" ? keyword : keyword.value;
                const hasKeyword = hasMentions({ trigger, value });

                const handleSelect: ReactEventHandler<HTMLButtonElement> = (e) => {
                  e.preventDefault();

                  if (hasKeyword) {
                    removeMentions({ trigger, value });
                    return;
                  }

                  insertMention({
                    trigger,
                    value,
                    data: typeof keyword === "string" ? undefined : keyword
                  });
                };

                return (
                  <DropdownMenuItem
                    as="button"
                    onSelect={handleSelect}
                    key={value}
                    icon={
                      hasKeyword ? (
                        <FontAwesomeIcon className="text-primary" icon={faCheckCircle} />
                      ) : (
                        <FontAwesomeIcon className="text-mineshaft-400" icon={faCircle} />
                      )
                    }
                    iconPos="left"
                  >
                    <span className="capitalize">{value}</span>
                  </DropdownMenuItem>
                );
              })}
            </Fragment>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
