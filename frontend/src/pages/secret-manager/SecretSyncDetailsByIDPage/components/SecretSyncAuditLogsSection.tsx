import { faFingerprint } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { Link } from "@tanstack/react-router";

import { EmptyState } from "@app/components/v2";
import { useSubscription } from "@app/context";
import { EventType } from "@app/hooks/api/auditLogs/enums";
import { TSecretSync } from "@app/hooks/api/secretSyncs";
import { LogsSection } from "@app/pages/organization/AuditLogsPage/components/LogsSection";

// Add more events if needed
const INTEGRATION_EVENTS = [
  EventType.SYNC_SECRET_SYNC,
  EventType.ERASE_SECRET_SYNC,
  EventType.IMPORT_SECRET_SYNC
];

type Props = {
  secretSync: TSecretSync;
};

export const SecretSyncAuditLogsSection = ({ secretSync }: Props) => {
  const { subscription } = useSubscription();

  const auditLogsRetentionDays = subscription?.auditLogsRetentionDays ?? 30;

  return (
    <div className="flex h-full w-full flex-col gap-3 rounded-lg border border-mineshaft-600 bg-mineshaft-900 px-4 py-3">
      <div className="flex items-center justify-between border-b border-mineshaft-400 pb-2">
        <h3 className="font-semibold text-mineshaft-100">Sync Logs</h3>
      </div>
      {subscription.auditLogs ? (
        <LogsSection
          refetchInterval={4000}
          remappedHeaders={{
            Metadata: "Sync Status"
          }}
          showFilters={false}
          presets={{
            eventMetadata: { syncId: secretSync.id },
            startDate: new Date(new Date().setDate(new Date().getDate() - auditLogsRetentionDays)),
            eventType: INTEGRATION_EVENTS
          }}
          filterClassName="bg-mineshaft-900 static"
        />
      ) : (
        <div className="flex h-full items-center justify-center rounded-lg bg-mineshaft-800 text-sm text-mineshaft-200">
          <div className="flex flex-col items-center gap-4">
            <FontAwesomeIcon size="2x" icon={faFingerprint} />
            <p>
              Please{" "}
              {subscription && subscription.slug !== null ? (
                <Link to="/organization/billing" target="_blank" rel="noopener noreferrer">
                  <a
                    className="cursor-pointer underline transition-all hover:text-white"
                    target="_blank"
                  >
                    upgrade your subscription
                  </a>
                </Link>
              ) : (
                <a
                  href="https://infisical.com/scheduledemo"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <a
                    className="cursor-pointer underline transition-all hover:text-white"
                    target="_blank"
                  >
                    upgrade your subscription
                  </a>
                </a>
              )}{" "}
              to view sync logs.
            </p>
          </div>
        </div>
      )}
    </div>
  );

  // eslint-disable-next-line no-nested-ternary
  return subscription?.auditLogs ? (
    <div className="h-full w-full min-w-[51rem] rounded-lg border border-mineshaft-600 bg-mineshaft-900 p-4">
      <div className="mb-4 flex items-center justify-between border-b border-mineshaft-400 pb-4">
        <p className="text-lg font-semibold text-gray-200">Integration Logs</p>
        <p className="text-xs text-gray-400">
          Displaying audit logs from the last {auditLogsRetentionDays} days
        </p>
      </div>
      <LogsSection
        refetchInterval={4000}
        remappedHeaders={{
          Metadata: "Sync Status"
        }}
        showFilters={false}
        presets={{
          eventMetadata: { syncId: secretSync.id },
          startDate: new Date(new Date().setDate(new Date().getDate() - auditLogsRetentionDays)),
          eventType: INTEGRATION_EVENTS
        }}
        filterClassName="bg-mineshaft-900 static"
      />
    </div>
  ) : (
    <div className="h-full w-full min-w-[51rem] rounded-lg border border-mineshaft-600 bg-mineshaft-900 p-4 opacity-60">
      <div className="mb-4 flex items-center justify-between border-b border-mineshaft-400 pb-4">
        <p className="text-lg font-semibold text-gray-200">Secret Sync Logs</p>
      </div>
      <EmptyState
        className="h-full rounded-lg"
        title={
          <div>
            <p>
              Please{" "}
              {subscription && subscription.slug !== null ? (
                <Link to="/organization/billing" target="_blank" rel="noopener noreferrer">
                  <a
                    className="cursor-pointer font-medium text-primary-500 transition-all hover:text-primary-600"
                    target="_blank"
                  >
                    upgrade your subscription
                  </a>
                </Link>
              ) : (
                <a
                  href="https://infisical.com/scheduledemo"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <a
                    className="cursor-pointer font-medium text-primary-500 transition-all hover:text-primary-600"
                    target="_blank"
                  >
                    upgrade your subscription
                  </a>
                </a>
              )}
              to view sync logs
            </p>
          </div>
        }
      />
    </div>
  );
};
