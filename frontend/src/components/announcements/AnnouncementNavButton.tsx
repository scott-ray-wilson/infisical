import { useState } from "react";
import { Megaphone } from "lucide-react";

import { IconButton, Tooltip, TooltipContent, TooltipTrigger } from "@app/components/v3";
import { useGetLatestAnnouncement } from "@app/hooks/api/announcement";

import { AnnouncementModal } from "./AnnouncementModal";
import { useAnnouncementSeen } from "./useAnnouncementSeen";

export const AnnouncementNavButton = () => {
  const { data: announcement } = useGetLatestAnnouncement();
  const { hasUnseen, markSeen } = useAnnouncementSeen();
  const [isOpen, setIsOpen] = useState(false);

  if (!announcement) return null;

  const showUnreadDot = hasUnseen(announcement.slug);

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (!open) markSeen(announcement.slug);
  };

  return (
    <>
      <Tooltip>
        <TooltipTrigger asChild>
          <IconButton
            variant="outline"
            size="sm"
            aria-label="What's new"
            className="relative"
            onClick={() => setIsOpen(true)}
          >
            <Megaphone />
            {showUnreadDot && (
              <span
                aria-hidden="true"
                className="absolute -top-0.5 -right-0.5 size-2 rounded-full bg-primary-400 ring-2 ring-background"
              />
            )}
          </IconButton>
        </TooltipTrigger>
        <TooltipContent side="bottom">What&apos;s new</TooltipContent>
      </Tooltip>
      <AnnouncementModal
        announcement={announcement}
        isOpen={isOpen}
        onOpenChange={handleOpenChange}
      />
    </>
  );
};
