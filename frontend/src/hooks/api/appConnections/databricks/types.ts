export type TDatabricksSecretScope = {
  scope: string;
};

export type TDatabricksConnectionListSecretScopesResponse = {
  secretScopes: TDatabricksSecretScope[];
};
