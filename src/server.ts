import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { createGitHubClient } from "./github/client.js";
import * as operations from "./github/operations.js";
import { errorResponse, toAppError } from "./errors/index.js";
import { schemas } from "./schemas/index.js";
import { log } from "./utils/logging.js";

export function createServer(client = createGitHubClient()) {
  const server = new McpServer({ name: "github-automation", version: "1.0.0" });
  const run = async (action: () => Promise<unknown>) => {
    try { const result = await action(); return { content: [{ type: "text" as const, text: JSON.stringify(result) }] }; }
    catch (error) { const appError = toAppError(error); log("error", appError.message, { kind: appError.kind, status: appError.status }); return errorResponse(appError); }
  };
  server.registerTool("create_repository", { description: "Crea un repositorio nuevo para el usuario autenticado. Usa esta tool cuando el usuario pida crear un proyecto en GitHub; permite elegir nombre, descripción y visibilidad.", inputSchema: schemas.createRepositorySchema.shape }, (input) => run(async () => (await operations.createRepository(client, input)).data));
  server.registerTool("create_issue", { description: "Abre un issue en un repositorio existente. Requiere owner, repo y title; puede incluir descripción y etiquetas.", inputSchema: schemas.createIssueSchema.shape }, (input) => run(async () => (await operations.createIssue(client, input)).data));
  server.registerTool("list_repositories", { description: "Lista los repositorios del usuario autenticado, filtrados por visibilidad y ordenados por actualización. No requiere owner ni repo.", inputSchema: schemas.listRepositoriesSchema.shape }, (input) => run(async () => (await operations.listRepositories(client, input)).data));
  server.registerTool("create_commit", { description: "Crea o actualiza un archivo en un repositorio existente y genera un commit. Usa una ruta relativa y proporciona el contenido textual y el mensaje del commit.", inputSchema: schemas.createCommitSchema.shape }, (input) => run(async () => (await operations.createCommit(client, input)).data));
  server.registerTool("list_issues", { description: "Lista los issues de un repositorio existente. Permite filtrar por estado y limitar la cantidad de resultados.", inputSchema: schemas.listIssuesSchema.shape }, (input) => run(async () => (await operations.listIssues(client, input)).data));
  return server;
}

const isDirectRun = Boolean(
  process.argv[1] &&
  (path.resolve(fileURLToPath(import.meta.url)).toLowerCase() === path.resolve(process.argv[1]).toLowerCase() ||
   import.meta.url === `file://${process.argv[1]}`)
);

if (isDirectRun) {
  const transport = new StdioServerTransport();
  createServer().connect(transport).catch((error) => { log("error", "MCP server failed to start", { message: error instanceof Error ? error.message : "unknown" }); process.exitCode = 1; });
}