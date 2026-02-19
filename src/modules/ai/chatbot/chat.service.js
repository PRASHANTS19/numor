const { numorAgent } = require("../chatbot/agent/numor.agent");
const { resolveUserContext } = require("./context/chat.resolveUserContext"); // unified context
const { buildSystemPrompt } = require("../chatbot/agent/system.prompt");
const { RemoveMessage } = require("@langchain/core/messages");

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
async function handleChat(user, message) {
  // const { baseContext, roleContext } = await resolveUserContext(user);

  // const systemPromptContent = buildSystemPrompt({
  //   baseContext,
  //   roleContext,
  // });
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
  console.log(JSON.stringify(result, null, 2));
  return result.messages.at(-1)?.content;
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



module.exports = { handleChat, getChatHistory, deleteChatHistory };