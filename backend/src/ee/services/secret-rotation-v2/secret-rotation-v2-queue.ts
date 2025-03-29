import { isAfter } from "date-fns";

import { TSecretRotationV2DALFactory } from "@app/ee/services/secret-rotation-v2/secret-rotation-v2-dal";
import {
  getNextUTCMidnight,
  getNextUTCMinute,
  getRotateAt
} from "@app/ee/services/secret-rotation-v2/secret-rotation-v2-fns";
import { TSecretRotationV2ServiceFactory } from "@app/ee/services/secret-rotation-v2/secret-rotation-v2-service";
import { TSecretRotationV2 } from "@app/ee/services/secret-rotation-v2/secret-rotation-v2-types";
import { getConfig } from "@app/lib/config/env";
import { logger } from "@app/lib/logger";
import { QueueJobs, QueueName, TQueueServiceFactory } from "@app/queue";

type TSecretRotationV2QueueServiceFactoryDep = {
  queueService: TQueueServiceFactory;
  secretRotationV2DAL: Pick<TSecretRotationV2DALFactory, "findSecretRotationsToQueue" | "findById">;
  secretRotationV2Service: Pick<TSecretRotationV2ServiceFactory, "rotateGeneratedCredentials">;
};

export type TSecretRotationV2QueueServiceFactory = Awaited<ReturnType<typeof secretRotationV2QueueServiceFactory>>;

export const secretRotationV2QueueServiceFactory = async ({
  queueService,
  secretRotationV2DAL,
  secretRotationV2Service
}: TSecretRotationV2QueueServiceFactoryDep) => {
  const appCfg = getConfig();

  if (appCfg.isRotationDevelopmentMode) {
    logger.warn("Secret Rotation V2 is in development mode.");
  }

  await queueService.startPg<QueueName.SecretRotationV2>(
    QueueJobs.SecretRotationV2QueueRotations,
    async () => {
      try {
        const rotateBy = appCfg.isRotationDevelopmentMode ? getNextUTCMinute() : getNextUTCMidnight();

        const currentTime = new Date();

        const secretRotations = await secretRotationV2DAL.findSecretRotationsToQueue(rotateBy);

        logger.info(
          `secretRotationV2Queue: Queue Rotations [currentTime=${currentTime.toISOString()}] [rotateBy=${rotateBy.toISOString()}] [count=${
            secretRotations.length
          }]`
        );

        for await (const rotation of secretRotations) {
          const rotateAt = getRotateAt(rotation.rotateAtUtc as TSecretRotationV2["rotateAtUtc"], currentTime);

          logger.info(
            `secretRotationV2Queue: Queue Rotation [rotationId=${rotation.id}] [lastRotatedAt=${new Date(
              rotation.lastRotatedAt
            ).toISOString()}] [rotateAt=${rotateAt.toISOString()}]`
          );
          await queueService.queuePg(
            QueueJobs.SecretRotationV2Rotate,
            { rotationId: rotation.id, queuedAt: currentTime },
            {
              jobId: `secret-rotation-v2-rotate-${rotation.id}`,
              retryLimit: 5,
              retryBackoff: true,
              startAfter: rotateAt
            }
          );
        }
      } catch (error) {
        logger.error(error, "secretRotationV2Queue: Queue Rotations Error:");
        throw error;
      }
    },
    {
      batchSize: 1,
      workerCount: 1,
      pollingIntervalSeconds: 0.5
    }
  );

  await queueService.startPg<QueueName.SecretRotationV2>(
    QueueJobs.SecretRotationV2Rotate,
    async ([job]) => {
      const { rotationId, queuedAt } = job.data!;
      const { retryCount, retryLimit } = job;

      const logDetails = `[rotationId=${job.data?.rotationId}] [jobId=${job.id}] attempt=[${retryCount}/${retryLimit}]`;

      try {
        const secretRotation = await secretRotationV2DAL.findById(rotationId);

        if (!secretRotation) throw new Error(`Secret rotation ${rotationId} not found`);

        if (isAfter(secretRotation.lastRotatedAt, queuedAt)) {
          // rotated since being queued, skip rotation
          logger.info(`secretRotationV2Queue: Skipping Rotation - Rotated Since Queue ${logDetails}`);
          return;
        }

        await secretRotationV2Service.rotateGeneratedCredentials(secretRotation, {
          jobId: job.id,
          shouldSendNotification: true,
          isFinalAttempt: retryCount === retryLimit
        });

        logger.info(`secretRotationV2Queue: Secrets Rotated ${logDetails}`);
      } catch (error) {
        logger.error(`secretRotationV2Queue: Failed to Rotate Secrets ${logDetails}`);
        throw error;
      }
    },
    {
      batchSize: 1,
      workerCount: 30,
      pollingIntervalSeconds: 0.5
    }
  );

  await queueService.schedulePg(
    QueueJobs.SecretRotationV2QueueRotations,
    appCfg.isRotationDevelopmentMode ? "* * * * *" : "0 0 * * *",
    undefined,
    { tz: "UTC" }
  );
};
