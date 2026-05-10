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
- Preserve user intent and applied filters
- Preserve conclusions and decisions
- Preserve finance-specific constraints like date range, amount thresholds, status filters, and grouping keys
- DO NOT include raw invoice/expense JSON
- DO NOT include IDs unless explicitly discussed
- Keep summary concise and factual

Conversation:
{messages}

Summary:
`;

const summaryMiddleware = summarizationMiddleware({
  model: summaryModel,

  // OR logic — any condition triggers summarization
  trigger: [
    { tokens: 9000 },
    ],

  // Keep latest messages verbatim so follow-up finance queries do not lose detail
  keep: {
    messages: 12,
  },

  trimTokensToSummarize: 3000,
  summaryPrompt,
});

module.exports = summaryMiddleware;
