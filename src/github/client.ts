import { Octokit } from "@octokit/rest";
import "dotenv/config";
import { AppError } from "../errors/index.js";

export function createGitHubClient(): Octokit {
  const token = process.env.GITHUB_TOKEN;
  if (!token) throw new AppError("AuthenticationError", "GITHUB_TOKEN no está configurado");
  return new Octokit({ auth: token, baseUrl: process.env.GITHUB_API_URL ?? "https://api.github.com" });
}