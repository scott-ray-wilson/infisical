import fs from "node:fs/promises";
import path from "node:path";

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

// Bundled-mode: if this file exists on disk, the backend serves announcements from it
// (and any referenced images from BUNDLED_IMAGE_DIR) instead of calling Contentful.
// Written by `scripts/bake-announcements.ts` during Docker build for self-hosted images.
export const BUNDLED_DIR = path.resolve(process.cwd(), "dist", "announcement-assets");
export const BUNDLED_JSON_PATH = path.join(BUNDLED_DIR, "announcements.json");
export const BUNDLED_IMAGE_DIR = path.join(BUNDLED_DIR, "images");

type TAnnouncementServiceFactoryDep = {
  userDAL: Pick<TUserDALFactory, "findById" | "updateById">;
};

export type TAnnouncementServiceFactory = ReturnType<typeof announcementServiceFactory>;

export const announcementServiceFactory = ({ userDAL }: TAnnouncementServiceFactoryDep) => {
  // let cache: CacheEntry | null = null;
  let hasLoggedFetchError = false;
  // null = not yet checked, [] = no bundle present, [...] = bundled announcements
  let bundled: TAnnouncement[] | null = null;
  let bundleChecked = false;

  const loadBundled = async (): Promise<TAnnouncement[] | null> => {
    if (bundleChecked) return bundled;
    bundleChecked = true;
    try {
      const raw = await fs.readFile(BUNDLED_JSON_PATH, "utf8");
      bundled = JSON.parse(raw) as TAnnouncement[];
      logger.info(
        `Loaded ${bundled.length} bundled announcement(s) from ${BUNDLED_JSON_PATH} — Contentful fetches disabled`
      );
      return bundled;
    } catch (err) {
      const { code } = err as NodeJS.ErrnoException;
      if (code !== "ENOENT") {
        logger.warn({ err }, `Failed to read bundled announcements at ${BUNDLED_JSON_PATH}`);
      }
      bundled = null;
      return null;
    }
  };

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

  const getAnnouncements = async (): Promise<TAnnouncement[]> => {
    const appCfg = getConfig();
    if (!appCfg.ANNOUNCEMENTS_ENABLED) return [];

    const fromBundle = await loadBundled();
    if (fromBundle) return fromBundle.slice(0, RECENT_LIMIT);

    return fetchRecent();
  };

  const listRecentAnnouncements = async ({
    userId
  }: {
    userId: string;
  }): Promise<{ announcements: TAnnouncement[]; lastSeenAnnouncementId: string | null }> => {
    const user = await userDAL.findById(userId);
    const lastSeenAnnouncementId = user?.lastSeenAnnouncementId ?? null;

    try {
      const announcements = await getAnnouncements();
      hasLoggedFetchError = false;
      return { announcements, lastSeenAnnouncementId };
    } catch (err) {
      if (!hasLoggedFetchError) {
        logger.warn({ err }, "Failed to fetch announcements — feature will be hidden until next attempt");
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
