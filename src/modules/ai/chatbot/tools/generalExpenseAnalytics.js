const { tool } = require("@langchain/core/tools");
const prisma = require("../../../../config/database");

const getExpenseAnalytics = tool(
  async ({ metric, startDate, endDate, category }, config) => {
    const userId = config?.configurable?.context?.userId;

    if (!userId) throw new Error("Missing user context");

    const dateFilter = {};
    if (startDate || endDate) {
      dateFilter.expenseDate = {};
      if (startDate) dateFilter.expenseDate.gte = new Date(startDate);
      if (endDate) dateFilter.expenseDate.lte = new Date(endDate);
    }

    let result;

    switch (metric) {

      case "total_expense":
        result = await prisma.expenseBill.aggregate({
          _sum: { totalAmount: true },
          where: {
            userId: BigInt(userId),
            ...dateFilter,
            ...(category ? { category } : {})
          }
        });
        return {
          value: result._sum.totalAmount?.toString() || "0.00"
        };

      case "total_tax":
        result = await prisma.$queryRaw`
          SELECT COALESCE(SUM((i."totalPrice" * i."taxRate") / 100), 0) AS value
          FROM expense_bill_items i
          JOIN expense_bills b ON b.id = i."expenseId"
          WHERE b."userId" = ${BigInt(userId)}
        `;
        return {
          value: Number(result[0].value).toFixed(2)
        };

      case "expense_count":
        const count = await prisma.expenseBill.count({
          where: {
            userId: BigInt(userId),
            ...dateFilter,
          }
        });
        return { value: count };

      case "average_expense":
        result = await prisma.expenseBill.aggregate({
          _avg: { totalAmount: true },
          where: {
            userId: BigInt(userId),
            ...dateFilter,
          }
        });
        return {
          value: result._avg.totalAmount?.toString() || "0.00"
        };

      default:
        throw new Error("Metric not supported");
    }
  },
  {
    name: "GetExpenseAnalytics",
    description: `
Fetch expense analytics including:
- total expense
- total tax on expenses
- expense count
- average expense
You can optionally filter by date range or category.
`,
    schema: {
      type: "object",
      properties: {
        metric: {
          type: "string",
          enum: [
            "total_expense",
            "total_tax",
            "expense_count",
            "average_expense"
          ]
        },
        startDate: { type: "string" },
        endDate: { type: "string" },
        category: { type: "string" }
      },
      required: ["metric"]
    }
  }
);

module.exports = { getExpenseAnalytics };