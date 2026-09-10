import type { Octokit } from "@octokit/rest";
import { withRetry } from "../utils/retry.js";
import type { CreateCommitInput, CreateIssueInput, CreateRepositoryInput, ListIssuesInput, ListRepositoriesInput } from "../types.js";

export async function createRepository(client: Octokit, input: CreateRepositoryInput) {
  return withRetry(() => client.rest.repos.createForAuthenticatedUser({ name: input.name, description: input.description, private: input.isPrivate }));
}

export async function createIssue(client: Octokit, input: CreateIssueInput) {
  return withRetry(() => client.rest.issues.create({ owner: input.owner, repo: input.repo, title: input.title, body: input.body, labels: input.labels }));
}

export async function listRepositories(client: Octokit, input: ListRepositoriesInput) {
  return withRetry(() => client.rest.repos.listForAuthenticatedUser({ visibility: input.visibility, per_page: input.perPage, sort: "updated" }));
}

export async function createCommit(client: Octokit, input: CreateCommitInput) {
  let file: { sha?: string } | undefined;
  try {
    const existing = await withRetry(() => client.rest.repos.getContent({ owner: input.owner, repo: input.repo, path: input.path, ref: input.branch }));
    file = Array.isArray(existing.data) || existing.data.type !== "file" ? undefined : existing.data;
  } catch (error) {
    if (typeof error !== "object" || error === null || !("status" in error) || error.status !== 404) throw error;
  }
  return withRetry(() => client.rest.repos.createOrUpdateFileContents({ owner: input.owner, repo: input.repo, path: input.path, message: input.message, content: Buffer.from(input.content).toString("base64"), branch: input.branch, sha: file?.sha }));
}

export async function listIssues(client: Octokit, input: ListIssuesInput) {
  return withRetry(() => client.rest.issues.listForRepo({ owner: input.owner, repo: input.repo, state: input.state, per_page: input.perPage }));
}