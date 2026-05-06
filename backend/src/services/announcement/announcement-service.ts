import { getConfig } from "@app/lib/config/env";
import { NotFoundError } from "@app/lib/errors";
import { logger } from "@app/lib/logger";
import { safeRequest } from "@app/lib/validator";
import { TUserDALFactory } from "@app/services/user/user-dal";

import { TAnnouncement, TContentfulEntriesResponse } from "./announcement-types";

// TODO: re-enable in-memory cache (5-min TTL) before merge — disabled during development
// so Contentful changes show up immediately without a backend restart.
// const CACHE_TTL_MS = 5 * 60 * 1000;
const CONTENT_TYPE = "featureUpdate";
const RECENT_LIMIT = 3;

// type CacheEntry = {
//   fetchedAt: number;
//   announcements: TAnnouncement[];
// };

type TAnnouncementServiceFactoryDep = {
  userDAL: Pick<TUserDALFactory, "findById" | "updateById">;
};

export type TAnnouncementServiceFactory = ReturnType<typeof announcementServiceFactory>;

export const announcementServiceFactory = ({ userDAL }: TAnnouncementServiceFactoryDep) => {
  // let cache: CacheEntry | null = null;
  let hasLoggedFetchError = false;

  const fetchRecent = async (): Promise<TAnnouncement[]> => {
    const appCfg = getConfig();

    if (!appCfg.ANNOUNCEMENTS_ENABLED || !appCfg.CONTENTFUL_SPACE_ID || !appCfg.CONTENTFUL_DELIVERY_TOKEN) {
      return [];
    }

    const url = `https://cdn.contentful.com/spaces/${appCfg.CONTENTFUL_SPACE_ID}/environments/${appCfg.CONTENTFUL_ENVIRONMENT}/entries`;

    const { data } = await safeRequest.get<TContentfulEntriesResponse>(url, {
      params: {
        content_type: CONTENT_TYPE,
        order: "-fields.published",
        limit: RECENT_LIMIT,
        include: 1
      },
      headers: {
        Authorization: `Bearer ${appCfg.CONTENTFUL_DELIVERY_TOKEN}`
      },
      timeout: 5000
    });

    const assetById = new Map<string, string>();
    for (const asset of data.includes?.Asset ?? []) {
      const fileUrl = asset.fields?.file?.url;
      if (fileUrl) {
        assetById.set(asset.sys.id, fileUrl.startsWith("//") ? `https:${fileUrl}` : fileUrl);
      }
    }

    return data.items.flatMap<TAnnouncement>((entry) => {
      if (!entry?.fields?.title || !entry.fields.body || !entry.fields.published) return [];

      const imageAssetId = entry.fields.image?.sys?.id;
      const imageUrl = imageAssetId ? (assetById.get(imageAssetId) ?? null) : null;

      return [
        {
          id: entry.sys.id,
          title: entry.fields.title,
          body: entry.fields.body,
          imageUrl,
          link: entry.fields.link ?? null,
          linkLabel: entry.fields.linkLabel ?? null,
          published: entry.fields.published
        }
      ];
    });
  };

  const listRecentAnnouncements = async ({
    userId
  }: {
    userId: string;
  }): Promise<{ announcements: TAnnouncement[]; lastSeenAnnouncementId: string | null }> => {
    // TODO: restore caching block before merge (see CACHE_TTL_MS above).
    // const now = Date.now();
    // if (cache && now - cache.fetchedAt < CACHE_TTL_MS) {
    //   ...
    // }

    const user = await userDAL.findById(userId);
    const lastSeenAnnouncementId = user?.lastSeenAnnouncementId ?? null;

    try {
      const announcements = await fetchRecent();
      hasLoggedFetchError = false;
      return { announcements, lastSeenAnnouncementId };
    } catch (err) {
      if (!hasLoggedFetchError) {
        logger.warn(
          { err },
          "Failed to fetch announcements from Contentful — feature will be hidden until next attempt"
        );
        hasLoggedFetchError = true;
      }
      return { announcements: [], lastSeenAnnouncementId };
    }
  };

  const markAnnouncementSeen = async ({ userId, announcementId }: { userId: string; announcementId: string }) => {
    const user = await userDAL.updateById(userId, { lastSeenAnnouncementId: announcementId });
    if (!user) throw new NotFoundError({ message: "User not found" });
    return { lastSeenAnnouncementId: user.lastSeenAnnouncementId ?? null };
  };

  return {
    listRecentAnnouncements,
    markAnnouncementSeen
  };
};
