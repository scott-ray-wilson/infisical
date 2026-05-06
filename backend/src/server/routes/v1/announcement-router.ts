import { z } from "zod";

import { UnauthorizedError } from "@app/lib/errors";
import { readLimit, writeLimit } from "@app/server/config/rateLimiter";
import { verifyAuth } from "@app/server/plugins/auth/verify-auth";
import { AuthMode } from "@app/services/auth/auth-type";

const AnnouncementSchema = z.object({
  id: z.string(),
  title: z.string(),
  body: z.string(),
  imageUrl: z.string().nullable(),
  link: z.string().nullable(),
  linkLabel: z.string().nullable(),
  published: z.string()
});

export const registerAnnouncementRouter = async (server: FastifyZodProvider) => {
  server.route({
    url: "/recent",
    config: {
      rateLimit: readLimit
    },
    method: "GET",
    schema: {
      operationId: "listRecentAnnouncements",
      response: {
        200: z.object({
          announcements: AnnouncementSchema.array(),
          lastSeenAnnouncementId: z.string().nullable()
        })
      }
    },
    onRequest: verifyAuth([AuthMode.JWT]),
    handler: async (req) => {
      if (req.auth.authMode !== AuthMode.JWT) {
        throw new UnauthorizedError({ message: "This endpoint can only be accessed by users" });
      }
      return server.services.announcement.listRecentAnnouncements({ userId: req.auth.userId });
    }
  });

  server.route({
    url: "/seen",
    config: {
      rateLimit: writeLimit
    },
    method: "POST",
    schema: {
      operationId: "markAnnouncementSeen",
      body: z.object({
        announcementId: z.string().min(1).max(255)
      }),
      response: {
        200: z.object({
          lastSeenAnnouncementId: z.string().nullable()
        })
      }
    },
    onRequest: verifyAuth([AuthMode.JWT]),
    handler: async (req) => {
      if (req.auth.authMode !== AuthMode.JWT) {
        throw new UnauthorizedError({ message: "This endpoint can only be accessed by users" });
      }
      return server.services.announcement.markAnnouncementSeen({
        userId: req.auth.userId,
        announcementId: req.body.announcementId
      });
    }
  });
};
