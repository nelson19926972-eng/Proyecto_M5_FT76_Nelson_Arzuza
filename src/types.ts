export interface CreateRepositoryInput {
  name: string;
  description?: string;
  isPrivate?: boolean;
}

export interface CreateIssueInput {
  owner: string;
  repo: string;
  title: string;
  body?: string;
  labels?: string[];
}

export interface ListRepositoriesInput {
  visibility?: "all" | "public" | "private";
  perPage?: number;
}

export interface CreateCommitInput {
  owner: string;
  repo: string;
  path: string;
  content: string;
  message: string;
  branch?: string;
}

export interface ListIssuesInput {
  owner: string;
  repo: string;
  state?: "open" | "closed" | "all";
  perPage?: number;
}