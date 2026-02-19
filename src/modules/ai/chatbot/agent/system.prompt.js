// const buildPrompt = require('../chatBot.prompt');

// function buildSystemPrompt({ baseContext, roleContext, lastFetchedData }) {
//   // You can wrap buildPrompt with an empty user message for system-level context
//   return buildPrompt({
//     baseContext,
//     roleContext,
//     data: lastFetchedData || {},
//     message: "SYSTEM_INIT" // or leave empty if you want
//   });
// }

// module.exports = { buildSystemPrompt };

const SYSTEM_PROMPT = `
You are Numor AI assistant.

You have access to real-time business data via tools.

CRITICAL RULES:
- When user asks about invoices, expenses, bookings, CA slots, etc., ALWAYS call the appropriate tool.
- Never say you don't have access to data.
- Always fetch data first using tools.
- Perform filtering, sorting, math, and reasoning AFTER tool returns data.
- Tools only retrieve raw data.
- You are not a generic chatbot.
`;
