import { getConfig } from "@app/lib/config/env";
import { logger } from "@app/lib/logger";
import { safeRequest } from "@app/lib/validator";

import { TAnnouncement, TContentfulEntriesResponse } from "./announcement-types";

// TODO: re-enable in-memory cache (5-min TTL) before merge — disabled during development
// so Contentful changes show up immediately without a backend restart.
// const CACHE_TTL_MS = 5 * 60 * 1000;
const CONTENT_TYPE = "featureUpdate";
const RECENT_LIMIT = 10;

// type CacheEntry = {
//   fetchedAt: number;
//   announcements: TAnnouncement[];
// };

export type TAnnouncementServiceFactory = ReturnType<typeof announcementServiceFactory>;

export const announcementServiceFactory = () => {
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

    const announcements: TAnnouncement[] = [];
    for (const entry of data.items) {
      if (!entry?.fields?.title || !entry.fields.body || !entry.fields.published) continue;

      const imageAssetId = entry.fields.image?.sys?.id;
      const imageUrl = imageAssetId ? assetById.get(imageAssetId) ?? null : null;

      announcements.push({
        id: entry.sys.id,
        title: entry.fields.title,
        body: entry.fields.body,
        imageUrl,
        link: entry.fields.link ?? null,
        linkLabel: entry.fields.linkLabel ?? null,
        published: entry.fields.published
      });
    }

    return announcements;
  };

  const listRecentAnnouncements = async (): Promise<TAnnouncement[]> => {
    // TODO: restore caching block before merge (see CACHE_TTL_MS above).
    // const now = Date.now();
    // if (cache && now - cache.fetchedAt < CACHE_TTL_MS) {
    //   return cache.announcements;
    // }

    try {
      const announcements = await fetchRecent();
      // cache = { fetchedAt: now, announcements };
      hasLoggedFetchError = false;
      return announcements;
    } catch (err) {
      if (!hasLoggedFetchError) {
        logger.warn(
          { err },
          "Failed to fetch announcements from Contentful — feature will be hidden until next attempt"
        );
        hasLoggedFetchError = true;
      }
      // cache = { fetchedAt: now, announcements: [] };
      return [];
    }
  };

  return {
    listRecentAnnouncements
  };
};
