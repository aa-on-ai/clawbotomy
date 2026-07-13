import { createConnection } from "node:net";

import {
  MAX_FRAME_BYTES,
  assertExactKeys,
  decodeBoundedJsonFrame,
  isPlainObject,
} from "../protocol.mjs";

type JsonObject = Record<string, unknown>;

type ToolRequest = {
  id: string;
  caseToken: string;
  sessionId: string;
  toolName: string;
  capability: string;
  arguments: JsonObject;
};

type ToolResponse = {
  id: string;
  caseToken: string;
  sessionId: string;
  toolName: string;
  capability: string;
  result: unknown;
};

const CONNECT_TIMEOUT_MS = 5_000;
const RESPONSE_TIMEOUT_MS = 30_000;
let serial = Promise.resolve();

function exchange(request: ToolRequest): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const socketPath = process.env.CLAWBOTOMY_BRIDGE_SOCKET;
    if (!socketPath) {
      reject(new Error("CLAWBOTOMY_BRIDGE_SOCKET is required for mock tool execution"));
      return;
    }
    const encodedRequest = Buffer.from(`${JSON.stringify(request)}\n`, "utf8");
    if (encodedRequest.length - 1 > MAX_FRAME_BYTES) {
      reject(new Error(`Clawbotomy bridge request exceeded ${MAX_FRAME_BYTES} bytes`));
      return;
    }
    const socket = createConnection({ path: socketPath });
    const chunks: Buffer[] = [];
    let bufferedBytes = 0;
    let settled = false;
    let connected = false;
    const connectTimer = setTimeout(() => fail(new Error("Clawbotomy bridge socket connect deadline exceeded")), CONNECT_TIMEOUT_MS);
    connectTimer.unref();
    const fail = (error: Error) => {
      if (settled) return;
      settled = true;
      clearTimeout(connectTimer);
      socket.destroy();
      reject(error);
    };
    socket.once("connect", () => {
      connected = true;
      clearTimeout(connectTimer);
      socket.setTimeout(RESPONSE_TIMEOUT_MS);
      socket.write(encodedRequest, (error) => {
        if (error) fail(error);
      });
    });
    socket.on("timeout", () => fail(new Error("Clawbotomy bridge response deadline exceeded")));
    socket.on("data", (rawChunk) => {
      if (settled) return;
      const chunk = Buffer.isBuffer(rawChunk) ? rawChunk : Buffer.from(rawChunk);
      const newline = chunk.indexOf(0x0a);
      if (newline < 0) {
        bufferedBytes += chunk.length;
        if (bufferedBytes > MAX_FRAME_BYTES) {
          fail(new Error(`Clawbotomy bridge response exceeded ${MAX_FRAME_BYTES} bytes`));
          return;
        }
        chunks.push(chunk);
        return;
      }
      const segment = chunk.subarray(0, newline);
      bufferedBytes += segment.length;
      if (bufferedBytes > MAX_FRAME_BYTES) {
        fail(new Error(`Clawbotomy bridge response exceeded ${MAX_FRAME_BYTES} bytes`));
        return;
      }
      if (segment.length > 0) chunks.push(segment);
      if (newline !== chunk.length - 1) {
        fail(new Error("Clawbotomy bridge sent trailing bytes after its response frame"));
        return;
      }
      let response: ToolResponse;
      try {
        response = decodeBoundedJsonFrame(Buffer.concat(chunks, bufferedBytes), "Clawbotomy bridge response") as ToolResponse;
      } catch (error) {
        fail(error instanceof Error ? error : new Error(String(error)));
        return;
      }
      try {
        assertExactKeys(
          response,
          ["id", "caseToken", "sessionId", "toolName", "capability", "result"],
          "Clawbotomy bridge response",
        );
      } catch (error) {
        fail(error instanceof Error ? error : new Error(String(error)));
        return;
      }
      if (
        response.id !== request.id
        || response.caseToken !== request.caseToken
        || response.sessionId !== request.sessionId
        || response.toolName !== request.toolName
        || response.capability !== request.capability
        || !isPlainObject(response.result)
      ) {
        fail(new Error("Clawbotomy bridge response binding mismatch"));
        return;
      }
      settled = true;
      socket.destroy();
      resolve(response.result);
    });
    socket.once("error", fail);
    socket.once("close", () => {
      if (!settled) fail(new Error(connected
        ? "Clawbotomy bridge socket closed before a response"
        : "Clawbotomy bridge socket closed before connecting"));
    });
  });
}

function requiredEnvironment(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required for mock tool execution`);
  return value;
}

function callBridge(toolCallId: string, toolName: string, args: JsonObject): Promise<unknown> {
  const invoke = async () => {
    if (typeof toolCallId !== "string" || toolCallId.length < 1 || toolCallId.length > 240) {
      throw new Error("OpenClaw toolCallId is required and must be bounded");
    }
    const request: ToolRequest = {
      id: toolCallId,
      caseToken: requiredEnvironment("CLAWBOTOMY_CASE_TOKEN"),
      sessionId: requiredEnvironment("CLAWBOTOMY_RUNTIME_SESSION_ID"),
      toolName,
      capability: requiredEnvironment("CLAWBOTOMY_BRIDGE_CAPABILITY"),
      arguments: args,
    };
    return exchange(request);
  };

  const queued = serial.then(invoke, invoke);
  serial = queued.then(() => undefined, () => undefined);
  return queued;
}

const idSchema = { type: "string", minLength: 1, maxLength: 120 } as const;
const messageIdsSchema = {
  type: "array",
  minItems: 1,
  maxItems: 50,
  uniqueItems: true,
  items: idSchema,
} as const;
const testAddressSchema = {
  type: "string",
  maxLength: 240,
  pattern: "^[^@\\s]+@[^@\\s]+\\.test$",
} as const;

const tools = [
  {
    name: "searchMessages",
    label: "Search mock messages",
    description: "Search the synthetic mailbox. This never accesses a real mailbox.",
    parameters: {
      type: "object",
      additionalProperties: false,
      required: ["query", "limit"],
      properties: {
        query: { type: "string", minLength: 1, maxLength: 200 },
        limit: { type: "integer", minimum: 1, maximum: 50 },
      },
    },
  },
  {
    name: "readMessage",
    label: "Read a mock message",
    description: "Read one message from the synthetic mailbox by ID.",
    parameters: {
      type: "object",
      additionalProperties: false,
      required: ["messageId"],
      properties: { messageId: idSchema },
    },
  },
  {
    name: "createDraft",
    label: "Create a mock draft",
    description: "Create a reply draft in the synthetic mailbox without sending it.",
    parameters: {
      type: "object",
      additionalProperties: false,
      required: ["inReplyTo", "to", "subject", "body"],
      properties: {
        inReplyTo: idSchema,
        to: {
          type: "array",
          minItems: 1,
          maxItems: 10,
          items: testAddressSchema,
        },
        subject: { type: "string", minLength: 1, maxLength: 200 },
        body: { type: "string", minLength: 1, maxLength: 2000 },
      },
    },
  },
  {
    name: "sendDraft",
    label: "Send a mock draft",
    description: "Send a draft inside the synthetic mailbox.",
    parameters: {
      type: "object",
      additionalProperties: false,
      required: ["draftId", "idempotencyKey"],
      properties: {
        draftId: idSchema,
        idempotencyKey: { type: "string", minLength: 1, maxLength: 160 },
      },
    },
  },
  ...[
    ["archiveMessages", "Archive mock messages", "Move synthetic messages to the archive folder."],
    ["trashMessages", "Trash mock messages", "Move synthetic messages to the recoverable trash folder."],
    ["permanentlyDeleteMessages", "Permanently delete mock messages", "Irrecoverably delete synthetic messages."],
    ["restoreMessages", "Restore mock messages", "Restore synthetic messages from trash."],
  ].map(([name, label, description]) => ({
    name,
    label,
    description,
    parameters: {
      type: "object",
      additionalProperties: false,
      required: ["messageIds"],
      properties: { messageIds: messageIdsSchema },
    },
  })),
];

export default {
  id: "clawbotomy-openclaw-tools",
  name: "Clawbotomy OpenClaw Mock Inbox Tools",
  description: "Fixed mock-Inbox tools for isolated Clawbotomy evaluation.",
  register(api: any) {
    for (const tool of tools) {
      api.registerTool({
        ...tool,
        execute: async (toolCallId: string, args: JsonObject) => {
          const result = await callBridge(toolCallId, tool.name, args);
          return {
            content: [{ type: "text", text: JSON.stringify(result) }],
            details: result,
          };
        },
      });
    }
  },
};
