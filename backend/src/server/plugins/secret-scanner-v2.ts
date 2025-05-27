import { GitLabWebHookEvent } from "@app/ee/services/secret-scanning-v2/gitlab";
import { BadRequestError } from "@app/lib/errors";
import { logger } from "@app/lib/logger";
import { writeLimit } from "@app/server/config/rateLimiter";

export const registerSecretScanningV2Webhooks = async (server: FastifyZodProvider) => {
  server.route({
    method: "POST",
    url: "/gitlab",
    config: {
      rateLimit: writeLimit
    },
    handler: async (req, res) => {
      logger.warn(req, "GITLAB WEBHOOK");
      const event = req.headers["x-gitlab-event"] as GitLabWebHookEvent;
      const token = req.headers["x-gitlab-token"] as string;

      if (event !== GitLabWebHookEvent.Push) {
        throw new BadRequestError({ message: `Event type not supported: ${event as string}` });
      }

      return res.send("ok");
    }
  });
};
