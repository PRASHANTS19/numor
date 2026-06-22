const { summarizationMiddleware } = require("langchain");
const { ChatGoogleGenerativeAI } = require("@langchain/google-genai");

const summaryModel = new ChatGoogleGenerativeAI({
  model: "gemini-2.0-flash-lite",
  temperature: 0,
  maxOutputTokens: 550,
});

const summaryPrompt = `
You are summarizing a financial assistant conversation.

Rules:
- Preserve user intent, decisions, and follow-up context
- Preserve finance-specific constraints like date range, amount thresholds, status filters, and grouping keys
- DO NOT include raw invoice/expense JSON
- DO NOT include IDs unless explicitly discussed
- Keep summary concise and factual
- Do not invent new actions or facts

Conversation:
{messages}

Summary:
`;

const summaryMiddleware = summarizationMiddleware({
  model: summaryModel,

  trigger: [
    { tokens: 3200 },
  ],

  // Keep latest messages verbatim so follow-up finance queries do not lose detail
  keep: {
    messages: 8,
  },

  trimTokensToSummarize: 2000,
  summaryPrompt,
});

async function summarizeMessages(messages) {
  if (!Array.isArray(messages) || messages.length === 0) {
    return "";
  }

  const conversation = messages
    .map((message) => {
      const role = message.role === "user" ? "User" : "Assistant";
      return `${role}: ${message.content}`;
    })
    .join("\n\n");

  const prompt = summaryPrompt.replace("{messages}", conversation);
  const result = await summaryModel.invoke(prompt);

  if (result?.content) {
    return result.content;
  }

  return typeof result === "string" ? result : String(result ?? "");
}

module.exports = {
  summaryMiddleware,
  summarizeMessages,
};
