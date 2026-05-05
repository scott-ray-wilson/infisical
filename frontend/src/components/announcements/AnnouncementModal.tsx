import { ExternalLink } from "lucide-react";

import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@app/components/v3";
import { TAnnouncement } from "@app/hooks/api/announcement";

type Props = {
  announcement: TAnnouncement;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
};

export const AnnouncementModal = ({ announcement, isOpen, onOpenChange }: Props) => {
  const ctaLabel = announcement.linkText || (announcement.linkUrl ? "Learn more" : null);

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg overflow-hidden p-0">
        {announcement.imageUrl && (
          <div className="aspect-[16/9] w-full overflow-hidden bg-muted">
            <img
              src={announcement.imageUrl}
              alt=""
              loading="eager"
              className="h-full w-full object-cover"
            />
          </div>
        )}
        <div className="flex flex-col gap-4 p-6">
          <DialogHeader>
            <DialogTitle>{announcement.title}</DialogTitle>
            <DialogDescription className="whitespace-pre-line">
              {announcement.description}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => onOpenChange(false)}>
              Got it
            </Button>
            {announcement.linkUrl && ctaLabel && (
              <Button variant="info" asChild>
                <a href={announcement.linkUrl} target="_blank" rel="noopener noreferrer">
                  {ctaLabel}
                  <ExternalLink />
                </a>
              </Button>
            )}
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
};
