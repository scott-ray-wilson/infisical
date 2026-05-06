import { z } from "zod";

import { readLimit } from "@app/server/config/rateLimiter";
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
    url: "/latest",
    config: {
      rateLimit: readLimit
    },
    method: "GET",
    schema: {
      operationId: "getLatestAnnouncement",
      response: {
        200: z.object({
          announcement: AnnouncementSchema.nullable()
        })
      }
    },
    onRequest: verifyAuth([AuthMode.JWT]),
    handler: async () => {
      const announcement = await server.services.announcement.getLatestAnnouncement();
      return { announcement };
    }
  });
};
