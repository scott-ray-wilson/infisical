import { DiscriminativePick } from "@app/types";

import {
  SecretScanningDataSource,
  SecretScanningFindingSeverity,
  SecretScanningFindingStatus,
  SecretScanningResource,
  SecretScanningScanStatus,
  SecretScanningScanType
} from "../enums";
import { TGitHubDataSource, TGitHubDataSourceOption } from "./github-data-source";
import { TGitLabDataSource, TGitLabDataSourceOption } from "./gitlab-data-source";

export type TSecretScanningDataSource = TGitLabDataSource | TGitHubDataSource;

export type TSecretScanningDataSourceWithDetails = TSecretScanningDataSource & {
  lastScannedAt: string | null;
  lastScanStatus: SecretScanningScanStatus | null;
  lastScanStatusMessage: string | null;
  unresolvedFindings: number | null;
};

export type TListSecretScanningDataSources = {
  dataSources: TSecretScanningDataSourceWithDetails[];
};

export type TSecretScanningDataSourceOption = TGitLabDataSourceOption | TGitHubDataSourceOption;

export type TListSecretScanningDataSourceOptions = {
  dataSourceOptions: TSecretScanningDataSourceOption[];
};

export type TSecretScanningDataSourceResponse = { dataSource: TSecretScanningDataSource };

export type TCreateSecretScanningDataSourceDTO = DiscriminativePick<
  TSecretScanningDataSource,
  "name" | "config" | "description" | "connectionId" | "type" | "isAutoScanEnabled" | "projectId"
>;

export type TUpdateSecretScanningDataSourceDTO = Partial<
  Omit<TCreateSecretScanningDataSourceDTO, "type" | "connectionId" | "projectId">
> & {
  type: SecretScanningDataSource;
  dataSourceId: string;
  // required for query invalidation
  projectId: string;
};

export type TDeleteSecretScanningDataSourceDTO = {
  type: SecretScanningDataSource;
  dataSourceId: string;
  // required for query invalidation
  projectId: string;
};

export type TTriggerSecretScanningDataSourceDTO = {
  type: SecretScanningDataSource;
  dataSourceId: string;
  resourceId?: string;
  // required for query invalidation
  projectId: string;
};

export type TGetSecretScanningDataSource = {
  dataSourceId: string;
  type: SecretScanningDataSource;
};

export type TSecretScanningResourceWithDetails = {
  id: string;
  dataSourceId: string;
  type: SecretScanningResource;
  externalId: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  lastScannedAt: string;
  lastScanStatus: SecretScanningScanStatus;
  lastScanStatusMessage: string | null;
  unresolvedFindings: number;
};

export type TListSecretScanningResourcesResponse = {
  resources: TSecretScanningResourceWithDetails[];
};

export type TSecretScanningScanWithDetails = {
  id: string;
  createdAt: string;
  resourceId: string;
  type: SecretScanningScanType;
  status: SecretScanningScanStatus;
  statusMessage?: string | null;
  unresolvedFindings: number;
  resolvedFindings: number;
  resourceName: string;
};

export type TListSecretScanningScansResponse = {
  scans: TSecretScanningScanWithDetails[];
};

export type TGetSecretScanningUnresolvedFindingsResponse = {
  unresolvedFindings: number;
};

export type TSecretScanningFinding = {
  id: string;
  dataSourceName: string;
  dataSourceType: SecretScanningDataSource;
  resourceName: string;
  resourceType: SecretScanningResource;
  rule: string;
  severity: SecretScanningFindingSeverity;
  status: SecretScanningFindingStatus;
  remarks?: string;
  fingerprint: string;
  // details: any;
  projectId: string;
  scanId: string;
  createdAt: string;
  updatedAt: string;
};

export type TListSecretScanningFindingsResponse = {
  findings: TSecretScanningFinding[];
};
