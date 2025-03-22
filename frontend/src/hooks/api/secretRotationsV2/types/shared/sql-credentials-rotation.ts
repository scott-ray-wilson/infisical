export type TSqlCredentialsRotationParameters = {
  usernameSecretKey: string;
  passwordSecretKey: string;
  issueStatement: string;
  revokeStatement: string;
};

export type TSqlCredentialsRotationGeneratedCredentials = {
  username: string;
  password: string;
};
