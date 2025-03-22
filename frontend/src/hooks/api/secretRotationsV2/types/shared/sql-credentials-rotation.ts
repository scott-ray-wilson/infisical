export type TSqlCredentialsRotationParameters = {
  usernameSecretKey: string;
  passwordSecretKey: string;
  issueStatement: string;
  revokeStatement: string;
};

export type TSqlCredentialsGeneratedCredentials = {
  username: string;
  password: string;
};
