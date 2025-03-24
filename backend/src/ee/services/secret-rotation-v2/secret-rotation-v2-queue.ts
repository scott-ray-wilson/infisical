import { TSecretRotationV2DALFactory } from "@app/ee/services/secret-rotation-v2/secret-rotation-v2-dal";
import { TSecretRotationV2ServiceFactory } from "@app/ee/services/secret-rotation-v2/secret-rotation-v2-service";
import { getConfig } from "@app/lib/config/env";
import { logger } from "@app/lib/logger";
import { QueueJobs, QueueName, TQueueServiceFactory } from "@app/queue";

type TSecretRotationV2QueueServiceFactoryDep = {
  queueService: TQueueServiceFactory;
  secretRotationV2DAL: Pick<TSecretRotationV2DALFactory, "findRaw" | "findById">;
  secretRotationV2Service: Pick<TSecretRotationV2ServiceFactory, "rotateGeneratedCredentials">;
};

type TSecretRotationV2QueueServiceFactory = Awaited<ReturnType<typeof secretRotationV2QueueServiceFactory>>;

export const secretRotationV2QueueServiceFactory = async ({
  queueService,
  secretRotationV2DAL,
  secretRotationV2Service
}: TSecretRotationV2QueueServiceFactoryDep) => {
  const appCfg = getConfig();

  await queueService.startPg<QueueName.SecretRotationV2>(
    QueueJobs.SecretRotationV2QueueRotations,
    async () => {
      const secretRotations = await secretRotationV2DAL.findRaw({});

      logger.warn(secretRotations.length, "secret rotations to rotate");

      for await (const rotation of secretRotations) {
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
    },
    {
      batchSize: 1,
      workerCount: 1,
      pollingIntervalSeconds: 5
    }
  );

  await queueService.startPg<QueueName.SecretRotationV2>(
    QueueJobs.SecretRotationV2Rotate,
    async ([job]) => {
      const { rotationId } = job.data!;

      logger.warn(`Secret rotation ${rotationId} rotated`);

      const secretRotation = await secretRotationV2DAL.findById(rotationId);

      if (!secretRotation) throw new Error(`Secret rotation ${rotationId} not found`);

      await secretRotationV2Service.rotateGeneratedCredentials(secretRotation);
    },
    {
      batchSize: 1,
      workerCount: 30,
      pollingIntervalSeconds: 1
    }
  );

  await queueService.schedulePg(
    QueueJobs.SecretRotationV2QueueRotations,
    appCfg.NODE_ENV === "development" ? "* * * * *" : "0 0 * * *",
    undefined,
    { tz: "UTC" }
  );
};
