export enum SecretRotation {
  PostgresCredentials = "postgres-credentials",
  MsSqlCredentials = "mssql-credentials",
  SendGridApiKey = "sendgrid-api-key",
  MySqlCredentials = "mysql-credentials",
  AwsIamCredentials = "aws-iam-credentials"
}

export enum SecretRotationStatus {
  Success = "success",
  Failed = "failed"
}
