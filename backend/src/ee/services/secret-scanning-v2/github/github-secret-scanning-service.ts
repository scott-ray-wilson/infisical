import { PushEvent } from "@octokit/webhooks-types";
import { TSecretScanningV2DALFactory } from "@app/ee/services/secret-scanning-v2/secret-scanning-v2-dal";
import { TSecretScanningV2QueueServiceFactory } from "@app/ee/services/secret-scanning-v2/secret-scanning-v2-queue";

export const githubSecretScanningService = (
  secretScanningV2DAL: TSecretScanningV2DALFactory,
  secretScanningV2Queue: Pick<TSecretScanningV2QueueServiceFactory, "queueResourceDiffScan">
) => {
  const handlePushEvent = async (payload: PushEvent) => {
    const { commits, repository, installation, pusher } = payload;

    if (!commits || !repository || !installation || !pusher) {
      // TODO: log or something?
      return;
    }

    const dataSource = await secretScanningV2DAL.dataSources.findOne({
      externalId: String(installation.id)
    });

    // TODO: log
    if (!dataSource) return;

    await secretScanningV2Queue.
  };
};