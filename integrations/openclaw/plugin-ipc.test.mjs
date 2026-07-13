import assert from "node:assert/strict";
import { once } from "node:events";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { createServer } from "node:net";
import test from "node:test";

test("TypeScript plugin relays one real tool execution through its private socket", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "clawbotomy-plugin-ipc-"));
  const socketPath = path.join(root, "bridge.sock");
  const observed = [];
  const server = createServer((socket) => {
    socket.setEncoding("utf8");
    let buffer = "";
    socket.on("data", (chunk) => {
      buffer += chunk;
      const newline = buffer.indexOf("\n");
      if (newline < 0) return;
      const request = JSON.parse(buffer.slice(0, newline));
      observed.push(request);
      socket.end(`${JSON.stringify({
        id: request.id,
        result: { ok: true, value: { id: request.arguments.messageId } },
      })}\n`);
    });
  });
  server.listen(socketPath);
  await once(server, "listening");
  process.env.CLAWBOTOMY_BRIDGE_SOCKET = socketPath;

  try {
    const plugin = (await import("./src/index.ts")).default;
    const tools = new Map();
    plugin.register({ registerTool(tool) { tools.set(tool.name, tool); } });
    assert.deepEqual([...tools.keys()], [
      "searchMessages",
      "readMessage",
      "createDraft",
      "sendDraft",
      "archiveMessages",
      "trashMessages",
      "permanentlyDeleteMessages",
      "restoreMessages",
    ]);
    const result = await tools.get("readMessage").execute("call-1", { messageId: "msg.test-1" });
    assert.deepEqual(observed, [{
      id: "plugin-0001",
      toolName: "readMessage",
      arguments: { messageId: "msg.test-1" },
    }]);
    assert.deepEqual(result.details, { ok: true, value: { id: "msg.test-1" } });
  } finally {
    delete process.env.CLAWBOTOMY_BRIDGE_SOCKET;
    await new Promise((resolve) => server.close(resolve));
    await rm(root, { recursive: true, force: true });
  }
});
