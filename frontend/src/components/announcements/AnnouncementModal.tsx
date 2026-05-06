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

const dateFormatter = new Intl.DateTimeFormat(undefined, {
  year: "numeric",
  month: "long",
  day: "numeric"
});

const formatPublished = (iso: string) => {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? null : dateFormatter.format(date);
};

export const AnnouncementModal = ({ announcement, isOpen, onOpenChange }: Props) => {
  const ctaLabel = announcement.linkLabel || (announcement.link ? "Learn more" : null);
  const publishedLabel = formatPublished(announcement.published);

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
            {publishedLabel && (
              <time
                dateTime={announcement.published}
                className="text-xs font-medium tracking-wide text-muted uppercase"
              >
                {publishedLabel}
              </time>
            )}
            <DialogTitle>{announcement.title}</DialogTitle>
            <DialogDescription className="whitespace-pre-line">
              {announcement.body}
            </DialogDescription>
            {announcement.link && ctaLabel && (
              <a
                href={announcement.link}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex w-fit items-center gap-1.5 text-sm text-white hover:underline"
              >
                {ctaLabel}
                <ExternalLink className="size-3.5" />
              </a>
            )}
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => onOpenChange(false)}>
              Got it
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
};
