import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { describe, expect, it, vi } from "vitest";
import { createServer } from "../src/server.js";

function createFakeClient() {
  return {
    rest: {
      repos: {
        createForAuthenticatedUser: vi.fn().mockResolvedValue({ data: { id: 1 } }),
        listForAuthenticatedUser: vi.fn().mockResolvedValue({ data: [] }),
        getContent: vi.fn(),
        createOrUpdateFileContents: vi.fn()
      },
      issues: {
        create: vi.fn().mockResolvedValue({ data: { number: 1 } }),
        listForRepo: vi.fn().mockResolvedValue({ data: [] })
      }
    }
  } as never;
}

async function connectServer() {
  const server = createServer(createFakeClient());
  const client = new Client({ name: "test-client", version: "1.0.0" });
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);
  return { client, server };
}

describe("MCP server", () => {
  it("exposes all tools with descriptions for the LLM", async () => {
    const { client, server } = await connectServer();
    const result = await client.listTools();

    expect(result.tools.map((tool) => tool.name)).toEqual([
      "create_repository",
      "create_issue",
      "list_repositories",
      "create_commit",
      "list_issues"
    ]);
    expect(result.tools.find((tool) => tool.name === "create_commit")?.description).toContain("archivo");
    expect(result.tools.find((tool) => tool.name === "create_commit")?.inputSchema.properties.path.description).toContain("Ruta relativa");

    await client.close();
    await server.close();
  });

  it("returns an MCP error for invalid tool input", async () => {
    const { client, server } = await connectServer();
    const result = await client.callTool({ name: "create_issue", arguments: { owner: "octocat", repo: "hello-world", title: " " } });

    expect(result.isError).toBe(true);
    expect(result.content[0]).toMatchObject({ type: "text" });
    expect((result.content[0] as { text: string }).text).toContain("El título es obligatorio");

    await client.close();
    await server.close();
  });

  it("invokes the GitHub operation through the MCP handler", async () => {
    const fakeClient = createFakeClient();
    const server = createServer(fakeClient);
    const client = new Client({ name: "test-client", version: "1.0.0" });
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);

    const result = await client.callTool({ name: "create_issue", arguments: { owner: "octocat", repo: "hello-world", title: "Bug" } });

    expect(result.isError).not.toBe(true);
    expect(fakeClient.rest.issues.create).toHaveBeenCalledWith(expect.objectContaining({ owner: "octocat", repo: "hello-world", title: "Bug" }));

    await client.close();
    await server.close();
  });
});
