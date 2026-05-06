import { getConfig } from "@app/lib/config/env";
import { logger } from "@app/lib/logger";
import { safeRequest } from "@app/lib/validator";

import { TAnnouncement, TContentfulEntriesResponse } from "./announcement-types";

// TODO: re-enable in-memory cache (5-min TTL) before merge — disabled during development
// so Contentful changes show up immediately without a backend restart.
// const CACHE_TTL_MS = 5 * 60 * 1000;
const CONTENT_TYPE = "featureUpdate";

// type CacheEntry = {
//   fetchedAt: number;
//   announcement: TAnnouncement | null;
// };

export type TAnnouncementServiceFactory = ReturnType<typeof announcementServiceFactory>;

export const announcementServiceFactory = () => {
  // let cache: CacheEntry | null = null;
  let hasLoggedFetchError = false;

  const fetchLatest = async (): Promise<TAnnouncement | null> => {
    const appCfg = getConfig();

    if (!appCfg.ANNOUNCEMENTS_ENABLED || !appCfg.CONTENTFUL_SPACE_ID || !appCfg.CONTENTFUL_DELIVERY_TOKEN) {
      return null;
    }

    const url = `https://cdn.contentful.com/spaces/${appCfg.CONTENTFUL_SPACE_ID}/environments/${appCfg.CONTENTFUL_ENVIRONMENT}/entries`;

    const { data } = await safeRequest.get<TContentfulEntriesResponse>(url, {
      params: {
        content_type: CONTENT_TYPE,
        order: "-fields.published",
        limit: 1,
        include: 1
      },
      headers: {
        Authorization: `Bearer ${appCfg.CONTENTFUL_DELIVERY_TOKEN}`
      },
      timeout: 5000
    });

    const entry = data.items[0];
    if (!entry?.fields?.title || !entry.fields.body || !entry.fields.published) {
      return null;
    }

    let imageUrl: string | null = null;
    const imageAssetId = entry.fields.image?.sys?.id;
    if (imageAssetId) {
      const asset = data.includes?.Asset?.find((a) => a.sys.id === imageAssetId);
      const fileUrl = asset?.fields?.file?.url;
      if (fileUrl) {
        imageUrl = fileUrl.startsWith("//") ? `https:${fileUrl}` : fileUrl;
      }
    }

    return {
      id: entry.sys.id,
      title: entry.fields.title,
      body: entry.fields.body,
      imageUrl,
      link: entry.fields.link ?? null,
      linkLabel: entry.fields.linkLabel ?? null,
      published: entry.fields.published
    };
  };

  const getLatestAnnouncement = async (): Promise<TAnnouncement | null> => {
    // TODO: restore caching block before merge (see CACHE_TTL_MS above).
    // const now = Date.now();
    // if (cache && now - cache.fetchedAt < CACHE_TTL_MS) {
    //   return cache.announcement;
    // }

    try {
      const announcement = await fetchLatest();
      // cache = { fetchedAt: now, announcement };
      hasLoggedFetchError = false;
      return announcement;
    } catch (err) {
      if (!hasLoggedFetchError) {
        logger.warn(
          { err },
          "Failed to fetch latest announcement from Contentful — feature will be hidden until next attempt"
        );
        hasLoggedFetchError = true;
      }
      // cache = { fetchedAt: now, announcement: null };
      return null;
    }
  };

  return {
    getLatestAnnouncement
  };
};
