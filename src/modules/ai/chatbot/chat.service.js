const { numorAgent } = require("../chatbot/agent/numor.agent");
const { resolveUserContext } = require("./context/chat.resolveUserContext"); // unified context
const { buildSystemPrompt } = require("../chatbot/agent/system.prompt");
const { RemoveMessage } = require("@langchain/core/messages");
const chatLogger = require("../../../utils/chat.logger");

/*
current flow
DB → Context Builder → Prompt → Gemini
Going  to implement tools later:
User: "Show unpaid invoices from last month"
↓
LLM calls tool: getInvoices({ status: "OVERDUE", month: "Dec" })
↓
Tool returns ONLY relevant rows
*/
async function handleChatStream(user, message, res) {
  const agentStart = Date.now();

  try {
    chatLogger.info({
      event: "CHAT_REQUEST_RECEIVED",
      userId: user.userId,
      sessionId: user.sessionId,
      role: user.role,
      messageLength: message.length,
    });

    // 🔥 Set SSE headers
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    let fullResponse = "";

    const stream = await numorAgent.stream(
      {
        messages: [{ role: "user", content: message }],
      },
      {
        configurable: {
          thread_id: `session-${user.sessionId}`,
          context: {
            userId: user.userId.toString(),
            role: user.role,
            orgId: user.orgId,
          },
        },
        streamMode: "messages", // 🔥 token streaming
      }
    );

    for await (const [chunk, metadata] of stream) {

      const type = chunk?._getType?.();
      // console.log("STREAM CHUNK:", { type, content: chunk.content, metadata });

      // Ignore tool output
      if (type === "tool") continue;

      // Only stream AI tokens
      if (type === "ai" && chunk.content) {
        fullResponse += chunk.content;
        console.log("STREAMING CHUNK:", chunk.content);
        res.write(`data: ${chunk.content}\n\n`);
      }
    }

    const agentLatency = Date.now() - agentStart;

    chatLogger.info({
      event: "AGENT_STREAM_COMPLETED",
      agentLatencyMs: agentLatency,
      userId: user.userId,
      sessionId: user.sessionId,
    });

    // End event
    res.write(`event: end\ndata: done\n\n`);
    res.end();
    console.log("Full response:", fullResponse);
    return ensureMarkdownFormatting(fullResponse);

  } catch (error) {
    chatLogger.error({
      event: "CHAT_ERROR",
      error: error.message,
      stack: error.stack,
    });

    res.write(`event: error\ndata: ${error.message}\n\n`);
    res.end();
  }
}

async function handleChat(user, message) {
  const agentStart = Date.now();

  try {
    chatLogger.info({
      event: "CHAT_REQUEST_RECEIVED",
      userId: user.userId,
      sessionId: user.sessionId,
      role: user.role,
      messageLength: message.length,
    });
    const result = await numorAgent.invoke(
      {
        messages: [
          // { role: "system", content: systemPromptContent },
          { role: "user", content: message },
        ],
      },
      {
        configurable: {
          thread_id: `session-${user.sessionId}`,
          context: {
            userId: user.userId.toString(),
            role: user.role,
            orgId: user.orgId,
          },
        },
      }
    );
    const agentLatency = Date.now() - agentStart;

    chatLogger.info({
      event: "AGENT_EXECUTION_COMPLETED",
      agentLatencyMs: agentLatency,
      userId: user.userId,
      sessionId: user.sessionId,
    });

    // console.log(JSON.stringify(result, null, 2));
    const raw = result.messages.at(-1)?.content;
    return ensureMarkdownFormatting(raw);
  }
  catch (error) {
    const agentLatency = Date.now() - agentStart;

    chatLogger.error({
      event: "CHAT_ERROR",
      userId: user.userId,
      sessionId: user.sessionId,
      agentLatencyMs: agentLatency,
      error: error.message,
      stack: error.stack,
    });

    throw error;
  }
}
function ensureMarkdownFormatting(text) {
  if (!text) return text;

  // Convert "*   **ID:**" style to markdown dash format
  return text
    .replace(/\*\s+\*\*/g, "- **") // convert weird bullet format
    .replace(/\n\*\s+/g, "\n- ");
}

async function getChatHistory(user) {
  const threadId = `session-${user.sessionId}`;
  const state = await numorAgent.getState({
    configurable: {
      thread_id: threadId,
    },
  });
  // console.log("RAW STATE:", JSON.stringify(state.values.messages, null, 2));

  return normalizeMessages(state?.values?.messages ?? []);

  // return state?.values?.messages ?? [];
}

function normalizeMessages(messages) {
  return messages
    .filter((msg) => {
      // 1️⃣ Keep Human messages
      if (msg._getType?.() === "human") return true;

      // 2️⃣ Keep only final AI messages (no tool calls)
      if (msg._getType?.() === "ai" && !msg.tool_calls?.length) {
        return true;
      }

      // ❌ Remove tool messages
      // ❌ Remove AI function call messages
      return false;
    })
    .map((msg) => ({
      role: msg._getType() === "human" ? "user" : "assistant",
      content: msg.content,
      id: msg.id,
    }));
}

async function deleteChatHistory(user) {
  const threadId = `session-${user.sessionId}`;

  // 1️⃣ Get current state
  const state = await numorAgent.getState({
    configurable: { thread_id: threadId },
  });

  const messages = state?.values?.messages ?? [];

  if (!messages.length) {
    return { deleted: 0 };
  }

  // 2️⃣ Convert all messages to RemoveMessage
  await numorAgent.updateState(
    {
      configurable: { thread_id: threadId },
    },
    {
      messages: messages.map(
        (m) => new RemoveMessage({ id: m.id })
      ),
    }
  );

  return { deleted: messages.length };
}



module.exports = { handleChat, getChatHistory, deleteChatHistory, handleChatStream };