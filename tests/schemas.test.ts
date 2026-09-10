import { describe, expect, it } from "vitest";
import { schemas } from "../src/schemas/index.js";

describe("schemas", () => {
  it("accepts a valid repository", () => expect(schemas.createRepositorySchema.parse({ name: "demo-repo" }).name).toBe("demo-repo"));
  it("rejects invalid repository characters", () => expect(() => schemas.createRepositorySchema.parse({ name: "bad repo" })).toThrow());
  it("rejects repository names shorter than three characters", () => expect(() => schemas.createRepositorySchema.parse({ name: "ab" })).toThrow());
  it("accepts a valid issue", () => expect(schemas.createIssueSchema.parse({ owner: "octocat", repo: "hello-world", title: "Bug" }).title).toBe("Bug"));
  it("rejects an empty issue title", () => expect(() => schemas.createIssueSchema.parse({ owner: "octocat", repo: "hello-world", title: " " })).toThrow());
  it("rejects unsafe commit paths", () => expect(() => schemas.createCommitSchema.parse({ owner: "octocat", repo: "hello-world", path: "../secret", message: "x" })).toThrow());
});