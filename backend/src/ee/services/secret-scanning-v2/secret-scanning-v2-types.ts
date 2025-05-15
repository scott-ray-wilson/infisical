import {
  TGitHubSecretScanningSource,
  TGitHubSecretScanningSourceInput,
  TGitHubSecretScanningSourceListItem,
  TGitHubSecretScanningSourceWithConnection
} from "@app/ee/services/secret-scanning-v2/github";
import {
  TGitLabSecretScanningSource,
  TGitLabSecretScanningSourceInput,
  TGitLabSecretScanningSourceListItem,
  TGitLabSecretScanningSourceWithConnection
} from "@app/ee/services/secret-scanning-v2/gitlab";

export type TSecretScanningSource = TGitHubSecretScanningSource | TGitLabSecretScanningSource;

export type TSecretScanningSourceWithConnection =
  | TGitHubSecretScanningSourceWithConnection
  | TGitLabSecretScanningSourceWithConnection;

export type TSecretScanningSourceInput = TGitHubSecretScanningSourceInput | TGitLabSecretScanningSourceInput;

export type TSecretScanningSourceListItem = TGitHubSecretScanningSourceListItem | TGitLabSecretScanningSourceListItem;

// export type TSecretRotationV2Raw = NonNullable<Awaited<ReturnType<TSecretRotationV2DALFactory["findById"]>>>;
//
// export type TListSecretRotationsV2ByProjectId = {
//   projectId: string;
//   type?: SecretRotation;
// };
//
// export type TFindSecretRotationV2ByIdDTO = {
//   rotationId: string;
//   type: SecretRotation;
// };
//
// export type TRotateSecretRotationV2 = TFindSecretRotationV2ByIdDTO & { auditLogInfo: AuditLogInfo };
//
// export type TRotateAtUtc = { hours: number; minutes: number };
//
// export type TFindSecretRotationV2ByNameDTO = {
//   rotationName: string;
//   secretPath: string;
//   environment: string;
//   projectId: string;
//   type: SecretRotation;
// };
//
// export type TCreateSecretRotationV2DTO = Pick<
//   TSecretRotationV2,
//   "parameters" | "secretsMapping" | "description" | "rotationInterval" | "name" | "connectionId" | "projectId"
// > & {
//   type: SecretRotation;
//   secretPath: string;
//   environment: string;
//   isAutoRotationEnabled?: boolean;
//   rotateAtUtc?: TRotateAtUtc;
// };
//
// export type TUpdateSecretRotationV2DTO = Partial<
//   Omit<TCreateSecretRotationV2DTO, "projectId" | "connectionId" | "secretPath" | "environment">
// > & {
//   rotationId: string;
//   type: SecretRotation;
// };
//
// export type TDeleteSecretRotationV2DTO = {
//   type: SecretRotation;
//   rotationId: string;
//   deleteSecrets: boolean;
//   revokeGeneratedCredentials: boolean;
// };
//
// export type TGetDashboardSecretRotationV2Count = {
//   search?: string;
//   projectId: string;
//   secretPath: string;
//   environments: string[];
// };
//
// export type TGetDashboardSecretRotationsV2 = {
//   search?: string;
//   projectId: string;
//   secretPath: string;
//   environments: string[];
//   orderBy?: SecretsOrderBy;
//   orderDirection?: OrderByDirection;
//   limit: number;
//   offset: number;
// };
//
// export type TQuickSearchSecretRotationsV2Filters = {
//   offset?: number;
//   limit?: number;
//   orderBy?: SecretsOrderBy;
//   orderDirection?: OrderByDirection;
//   search?: string;
// };
//
// export type TQuickSearchSecretRotationsV2 = {
//   projectId: string;
//   folderMappings: { folderId: string; path: string; environment: string }[];
//   filters: TQuickSearchSecretRotationsV2Filters;
// };
//
// export type TSecretRotationRotateGeneratedCredentials = {
//   auditLogInfo?: AuditLogInfo;
//   jobId?: string;
//   shouldSendNotification?: boolean;
//   isFinalAttempt?: boolean;
//   isManualRotation?: boolean;
// };
//
// export type TSecretRotationRotateSecretsJobPayload = { rotationId: string; queuedAt: Date; isManualRotation: boolean };
//
// export type TSecretRotationSendNotificationJobPayload = {
//   secretRotation: TSecretRotationV2Raw;
// };
//
// // scott: the reason for the callback structure of the rotation factory is to facilitate, when possible,
// // transactional behavior. By passing in the rotation mutation, if this mutation fails we can roll back the
// // third party credential changes (when supported), preventing credentials getting out of sync
//
// export type TRotationFactoryIssueCredentials<T extends TSecretRotationV2GeneratedCredentials> = (
//   callback: (newCredentials: T[number]) => Promise<TSecretRotationV2Raw>
// ) => Promise<TSecretRotationV2Raw>;
//
// export type TRotationFactoryRevokeCredentials<T extends TSecretRotationV2GeneratedCredentials> = (
//   generatedCredentials: T,
//   callback: () => Promise<TSecretRotationV2Raw>
// ) => Promise<TSecretRotationV2Raw>;
//
// export type TRotationFactoryRotateCredentials<T extends TSecretRotationV2GeneratedCredentials> = (
//   credentialsToRevoke: T[number] | undefined,
//   callback: (newCredentials: T[number]) => Promise<TSecretRotationV2Raw>
// ) => Promise<TSecretRotationV2Raw>;
//
// export type TRotationFactoryGetSecretsPayload<T extends TSecretRotationV2GeneratedCredentials> = (
//   generatedCredentials: T[number]
// ) => { key: string; value: string }[];
//
// export type TRotationFactory<
//   T extends TSecretRotationV2WithConnection,
//   C extends TSecretRotationV2GeneratedCredentials
// > = (
//   secretRotation: T,
//   appConnectionDAL: Pick<TAppConnectionDALFactory, "findById" | "update" | "updateById">,
//   kmsService: Pick<TKmsServiceFactory, "createCipherPairWithDataKey">
// ) => {
//   issueCredentials: TRotationFactoryIssueCredentials<C>;
//   revokeCredentials: TRotationFactoryRevokeCredentials<C>;
//   rotateCredentials: TRotationFactoryRotateCredentials<C>;
//   getSecretsPayload: TRotationFactoryGetSecretsPayload<C>;
// };
