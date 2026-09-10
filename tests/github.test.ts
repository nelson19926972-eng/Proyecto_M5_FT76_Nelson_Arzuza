import { describe, expect, it, vi } from "vitest";
import * as operations from "../src/github/operations.js";

function client() {
  return { rest: { repos: { createForAuthenticatedUser: vi.fn(), listForAuthenticatedUser: vi.fn(), getContent: vi.fn(), createOrUpdateFileContents: vi.fn() }, issues: { create: vi.fn(), listForRepo: vi.fn() } } } as never;
}

describe("GitHub operations", () => {
  it("creates a repository", async () => { const c = client(); c.rest.repos.createForAuthenticatedUser.mockResolvedValue({ data: { id: 1 } }); await operations.createRepository(c, { name: "demo" }); expect(c.rest.repos.createForAuthenticatedUser).toHaveBeenCalledWith(expect.objectContaining({ name: "demo" })); });
  it("creates an issue", async () => { const c = client(); c.rest.issues.create.mockResolvedValue({ data: { number: 2 } }); await operations.createIssue(c, { owner: "o", repo: "r", title: "T" }); expect(c.rest.issues.create).toHaveBeenCalled(); });
  it("lists repositories", async () => { const c = client(); c.rest.repos.listForAuthenticatedUser.mockResolvedValue({ data: [] }); await operations.listRepositories(c, { visibility: "all", perPage: 30 }); expect(c.rest.repos.listForAuthenticatedUser).toHaveBeenCalled(); });
  it("updates an existing file with its SHA", async () => { const c = client(); c.rest.repos.getContent.mockResolvedValue({ data: { type: "file", sha: "abc" } }); c.rest.repos.createOrUpdateFileContents.mockResolvedValue({ data: {} }); await operations.createCommit(c, { owner: "o", repo: "r", path: "a.txt", content: "hello", message: "update" }); expect(c.rest.repos.createOrUpdateFileContents).toHaveBeenCalledWith(expect.objectContaining({ sha: "abc" })); });
  it("creates a new file when GitHub returns 404", async () => { const c = client(); c.rest.repos.getContent.mockRejectedValue({ status: 404 }); c.rest.repos.createOrUpdateFileContents.mockResolvedValue({ data: {} }); await operations.createCommit(c, { owner: "o", repo: "r", path: "new.txt", content: "hello", message: "add" }); expect(c.rest.repos.createOrUpdateFileContents).toHaveBeenCalledWith(expect.objectContaining({ path: "new.txt", sha: undefined })); });
});