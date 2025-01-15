export type TGitHubConnectionOrganization = {
  login: string;
  id: number;
};

export type TGitHubConnectionRepository = {
  id: number;
  name: string;
  owner: TGitHubConnectionOrganization;
};

export type TGitHubConnectionListRepositoriesResponse = {
  repositories: TGitHubConnectionRepository[];
};

export type TGitHubConnectionListOrganizationsResponse = {
  organizations: TGitHubConnectionOrganization[];
};
