export type TSqlCredentialsRotationProperties = {
  parameters: {
    issueStatement: string;
    revokeStatement: string;
  };
  secretsMapping: {
    username: string;
    password: string;
  };
};

export type TSqlCredentialsRotationGeneratedCredentials = {
  username: string;
  password: string;
};
