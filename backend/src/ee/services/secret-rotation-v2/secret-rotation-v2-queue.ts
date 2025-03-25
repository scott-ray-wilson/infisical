import { isAfter } from "date-fns";

import { TSecretRotationV2DALFactory } from "@app/ee/services/secret-rotation-v2/secret-rotation-v2-dal";
import { getNextUTCMidnight, getNextUTCMinute } from "@app/ee/services/secret-rotation-v2/secret-rotation-v2-fns";
import { TSecretRotationV2ServiceFactory } from "@app/ee/services/secret-rotation-v2/secret-rotation-v2-service";
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

  await queueService.startPg<QueueName.SecretRotationV2>(
    QueueJobs.SecretRotationV2QueueRotations,
    async () => {
      try {
        const rotateBy = appCfg.isDevelopmentMode ? getNextUTCMinute() : getNextUTCMidnight();

        const secretRotations = await secretRotationV2DAL.findSecretRotationsToQueue(rotateBy);

        const currentTime = new Date();

        logger.info(
          `secretRotationV2Queue: Queue Rotations [currentTime=${currentTime.toISOString()}] [count=${
            secretRotations.length
          }]`
        );

        for await (const rotation of secretRotations) {
          const scheduledRotation = new Date(rotation.nextRotationAt);

          if (isAfter(rotation.nextRotationAt, currentTime)) {
            logger.info(
              `secretRotationV2Queue: Queue Rotation After [rotationId=${
                rotation.id
              }] [scheduledRotation=${scheduledRotation.toISOString()}]`
            );
            await queueService.queueAfterPg(
              QueueJobs.SecretRotationV2Rotate,
              { rotationId: rotation.id },
              {
                jobId: `secret-rotation-v2-rotate-${rotation.id}`,
                retryLimit: 5,
                retryBackoff: true
              },
              scheduledRotation
            );
          } else {
            logger.info(
              `secretRotationV2Queue: Queue Rotation [rotationId=${
                rotation.id
              }] [scheduledRotation=${scheduledRotation.toISOString()}]`
            );
            await queueService.queuePg(
              QueueJobs.SecretRotationV2Rotate,
              { rotationId: rotation.id },
              {
                jobId: `secret-rotation-v2-rotate-${rotation.id}`,
                retryLimit: 5,
                retryBackoff: true
              }
            );
          }
        }
      } catch (error) {
        logger.error(error, "secretRotationV2Queue: Queue Rotations Error:");
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
      try {
        const { rotationId } = job.data!;

        const secretRotation = await secretRotationV2DAL.findById(rotationId);

        if (!secretRotation) throw new Error(`Secret rotation ${rotationId} not found`);

        await secretRotationV2Service.rotateGeneratedCredentials(secretRotation);

        logger.info(`secretRotationV2Queue: Secrets Rotated [rotationId=${job.data?.rotationId}]`);
      } catch (error) {
        logger.error(`secretRotationV2Queue: Failed to Rotate Secrets [rotationId=${job.data?.rotationId}]`);
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
    appCfg.isDevelopmentMode ? "* * * * *" : "0 0 * * *",
    undefined,
    { tz: "UTC" }
  );
};
