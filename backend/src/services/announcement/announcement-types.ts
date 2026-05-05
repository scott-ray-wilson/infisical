export type TAnnouncement = {
  slug: string;
  title: string;
  description: string;
  imageUrl: string | null;
  linkUrl: string | null;
  linkText: string | null;
  publishedAt: string;
};

type TContentfulAsset = {
  sys: { id: string };
  fields: {
    file?: {
      url?: string;
    };
  };
};

export type TContentfulAnnouncementEntry = {
  sys: { id: string };
  fields: {
    slug?: string;
    title?: string;
    description?: string;
    image?: { sys: { id: string } };
    linkUrl?: string;
    linkText?: string;
    publishedAt?: string;
  };
};

export type TContentfulEntriesResponse = {
  items: TContentfulAnnouncementEntry[];
  includes?: {
    Asset?: TContentfulAsset[];
  };
};
