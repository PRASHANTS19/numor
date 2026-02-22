const { createAgent } = require("langchain");
const { ChatGoogleGenerativeAI } = require("@langchain/google-genai");
const { MemorySaver } = require("@langchain/langgraph");
const { PostgresSaver } = require("@langchain/langgraph-checkpoint-postgres");
const { Pool } = require('pg');
const { SYSTEM_PROMPT } = require("./system.prompt");
const { getInvoices } = require("../tools/user.listInvoices.tool");
const { listInvoiceItems } = require("../tools/user.invoiceItems.tool");
const { getExpenses } = require("../tools/user.listExpenses.tool");
const { fetchCASlots } = require("../tools/caSlot.tool");
const { fetchCAReviews } = require("../tools/caReview.tool");
const { fetchCABookings } = require("../tools/caBooking.tool");
const summaryMiddleware = require("../middleware/summarizationMiddleware");
const { getExpenseDetails } = require("../tools/user.expenseItems.tool");
const chatLogger = require("../../../../utils/chat.logger");
const {listAllUserInvoiceItems} = require("../tools/listAllUserInvoiceItems")
const {listAllUserExpenseItems} = require("../tools/listAllUserExpenseItems")
const {getTotalInvoiceTax} = require("../tools/getTotalInvoiceTax")
const {getAnalyticsForInvoice} = require("../tools/generalInvoiceAnalytics")
const contextSchema = {
  type: "object",
  properties: {
    userId: { type: "string" },
    role: { type: "string" },
    orgId: { type: "string" },
  },
};

const baseModel = new ChatGoogleGenerativeAI({
  model: "gemini-2.5-flash",
  temperature: 0.2,
  maxOutputTokens: 1048,
});
// const checkpointer = new MemorySaver();
// ---- POSTGRES CHECKPOINTER ----

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false, 
  }
});

const checkpointer = new PostgresSaver(pool);
// IMPORTANT: run once on app startup
async function initCheckpointer() {
  if (process.env.RUN_LANGGRAPH_SETUP === "true") {
    await checkpointer.setup();
    console.log("✅ LangGraph tables ensured");
  }
}

const numorAgent = createAgent({
  model: baseModel,
  tools: [
    getInvoices,
    getExpenses,    
    fetchCASlots,
    fetchCAReviews,
    fetchCABookings,
    listInvoiceItems,
    getExpenseDetails,
    listAllUserInvoiceItems,
    listAllUserExpenseItems,
    getTotalInvoiceTax,
    getAnalyticsForInvoice
  ],
  systemPrompt: SYSTEM_PROMPT, 
  checkpointer,
  contextSchema,
  middleware: [
    summaryMiddleware,
  ],
});

module.exports = {
  numorAgent,
  initCheckpointer
};
