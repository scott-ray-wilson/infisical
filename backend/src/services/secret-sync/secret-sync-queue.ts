import { InternalServerError } from "@app/lib/errors";
import { QueueJobs, QueueName, TQueueServiceFactory } from "@app/queue";
import { TSecretSyncDALFactory } from "@app/services/secret-sync/secret-sync-dal";
import { TManualTriggerSecretSyncDTO } from "@app/services/secret-sync/secret-sync-types";

export type TSecretSyncQueueFactory = ReturnType<typeof secretSyncQueueFactory>;

type TSecretSyncQueueFactoryDep = {
  queueService: TQueueServiceFactory;
  secretSyncDAL: TSecretSyncDALFactory;
};

export const secretSyncQueueFactory = ({ queueService }: TSecretSyncQueueFactoryDep) => {
  // TODO: telemetry
  // const integrationMeter = opentelemetry.metrics.getMeter("Integrations");
  // const errorHistogram = integrationMeter.createHistogram("integration_secret_sync_errors", {
  //     description: "Integration secret sync errors",
  //     unit: "1"
  // });

  queueService.start(QueueName.AppConnectionSecretSync, async (job) => {
    switch (job.name) {
      case QueueJobs.AppConnectionTriggerSecretSync:
        console.log("!!!! SECRET SYNC TRIGGERED !!!");
        break;
      case QueueJobs.AppConnectionTriggerSecretSyncs:
        // TODO
        break;
      default:
        // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
        throw new InternalServerError({ message: `Unhandled App Connection Secret Synce Queue Job ${job.name}` });
    }
  });

  const triggerSecretSync = async (params: TManualTriggerSecretSyncDTO) => {
    await queueService.queue(QueueName.AppConnectionSecretSync, QueueJobs.AppConnectionTriggerSecretSync, params, {
      attempts: 5,
      delay: 1000,
      backoff: {
        type: "exponential",
        delay: 3000
      },
      removeOnComplete: true,
      removeOnFail: true
    });
  };

  return {
    triggerSecretSync
  };
};
