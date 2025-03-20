export enum SecretRotation {
  PostgresCredentials = "postgres-credentials",
  MsSqlCredentials = "mssql-login-credentials"
}

export enum SecretRotationStatus {
  Success = "success",
  Failed = "failed"
}
