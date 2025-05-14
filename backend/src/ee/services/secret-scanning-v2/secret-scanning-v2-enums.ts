export enum SecretScanningSource {
  GitHub = "github",
  GitLab = "gitlab"
}

export enum SecretScanningScanStatus {
  Completed = "completed",
  Failed = "failed",
  Scanning = "scanning",
  Queued = "queued"
}

export enum SecretScanningFindingStatus {
  Resolved = "resolved",
  Unresolved = "unresolved"
}

// TODO: should this be source type specific?
export enum SecretScanningTarget {
  Repository = "repository"
}
