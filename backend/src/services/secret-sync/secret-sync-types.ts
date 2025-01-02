import { Job } from "bullmq";

import { TCreateAuditLogDTO } from "@app/ee/services/audit-log/audit-log-types";
import { QueueJobs } from "@app/queue";
import {
  TGitHubSync,
  TGitHubSyncInput,
  TGitHubSyncListItem,
  TGitHubSyncWithConnection
} from "@app/services/secret-sync/github";
import { TSecretSyncDALFactory } from "@app/services/secret-sync/secret-sync-dal";
import { SecretSync } from "@app/services/secret-sync/secret-sync-enums";

import {
  TAwsParameterStoreSync,
  TAwsParameterStoreSyncInput,
  TAwsParameterStoreSyncListItem,
  TAwsParameterStoreSyncWithConnection
} from "./aws-parameter-store";

export type TSecretSync = TAwsParameterStoreSync | TGitHubSync;

export type TSecretSyncWithConnection = TAwsParameterStoreSyncWithConnection | TGitHubSyncWithConnection;

export type TSecretSyncInput = TAwsParameterStoreSyncInput | TGitHubSyncInput;

export type TSecretSyncListItem = TAwsParameterStoreSyncListItem | TGitHubSyncListItem;

export type TListSecretSyncsByProjectId = {
  projectId: string;
  destination?: SecretSync;
};

export type TFindSecretSyncByIdDTO = {
  syncId: string;
  destination: SecretSync;
};

export type TFindSecretSyncByNameDTO = {
  syncName: string;
  projectId: string;
  destination: SecretSync;
};

export type TCreateSecretSyncDTO = Pick<
  TSecretSync,
  "syncOptions" | "destinationConfig" | "secretPath" | "envId" | "name" | "connectionId"
> & { destination: SecretSync };

export type TUpdateSecretSyncDTO = Partial<Omit<TCreateSecretSyncDTO, "connectionId">> & {
  syncId: string;
  destination: SecretSync;
};

export type TDeleteSecretSyncDTO = {
  destination: SecretSync;
  syncId: string;
};

type AuditLogInfo = Pick<TCreateAuditLogDTO, "userAgent" | "userAgentType" | "ipAddress" | "actor">;

export type TTriggerSyncSecretByIdDTO = {
  syncId: string;
  auditLogInfo: AuditLogInfo;
  triggeredByUserId?: string;
};

export type TTriggerSecretSyncDTO = {
  destination: SecretSync;
} & TTriggerSyncSecretByIdDTO;

export type TTriggerSecretSyncsByPathDTO = {
  secretPath: string;
  environmentSlug: string;
  projectId: string;
};

type TSecretSyncRaw = NonNullable<Awaited<ReturnType<TSecretSyncDALFactory["findById"]>>>;

export type TQueueSecretSyncPayload = {
  secretSync: TSecretSyncRaw;
  auditLogInfo?: AuditLogInfo;
  triggeredByUserId?: string;
};

export type TQueueSendSecretSyncFailedNotificationsPayload = {
  secretSync: TSecretSyncRaw;
  triggeredByUserId?: string;
};

export type TSyncSecretsJobDTO = Job<TQueueSecretSyncPayload, void, QueueJobs.AppConnectionSyncSecrets>;

export type TSendSecretSyncFailedNotificationsJobDTO = Job<
  TQueueSendSecretSyncFailedNotificationsPayload,
  void,
  QueueJobs.AppConnectionSendSecretSyncFailedNotifications
>;

export type TSecretMap = Record<
  string,
  { value: string; comment?: string; skipMultilineEncoding?: boolean | null | undefined }
>;
