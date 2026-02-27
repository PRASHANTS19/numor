const { tool } = require("@langchain/core/tools");
const prisma = require("../../../../config/database");

const getExpenseDetails = tool(
  async ({ expenseId }) => {
    return prisma.expenseBill.findUnique({
      where: { id: BigInt(expenseId) },
      select: {
        merchant: true,
        expenseDate: true,
        totalAmount: true,
        category: true,
        paymentMethod: true,
        receiptUrl: true,
        items: {
          select: {
            itemName: true,
            quantity: true,
            unitPrice: true,
            totalPrice: true,
          },
        },
      },
    });
  },
  {
    name: "getExpenseDetails",
    description: `
Fetch detailed expense including items.
Use only when user explicitly asks for details.
- You need to return response in markdown format with appropriate headings, bullet points, line breaks i.e <br>,tables, etc. to make it easy to read, make sure all the markdown syntax is correct and properly rendered.

`,
    schema: {
      type: "object",
      properties: {
        expenseId: { type: "string" },
      },
      required: ["expenseId"],
    },
  }
);

module.exports = { getExpenseDetails };
