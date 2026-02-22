const { tool } = require("@langchain/core/tools");
const prisma = require("../../../../config/database");

const getAnalyticsForInvoice = tool(
  async ({ metric, startDate, endDate }, config) => {
    const userId = config?.configurable?.context?.userId;

    if (!userId) throw new Error("Missing user context");

    let result;

    switch (metric) {

      case "total_tax":
        result = await prisma.$queryRaw`
          SELECT COALESCE(SUM((i."totalPrice" * i."taxRate") / 100), 0) as value
          FROM invoice_bill_items i
          JOIN invoice_bills b ON b.id = i."invoiceId"
          WHERE b."customerId" = ${BigInt(userId)}
        `;
        break;

      case "invoice_count":
        result = await prisma.invoiceBill.count({
          where: { customerId: BigInt(userId) }
        });
        return { value: result };

      case "total_revenue":
        result = await prisma.$queryRaw`
          SELECT COALESCE(SUM(i."totalPrice"), 0) as value
          FROM invoice_bill_items i
          JOIN invoice_bills b ON b.id = i."invoiceId"
          WHERE b."customerId" = ${BigInt(userId)}
        `;
        break;

      default:
        throw new Error("Metric not supported");
    }

    return { value: Number(result[0].value).toFixed(2) };
  },
  {
    name: "GetAnalytics",
    description: `
Fetch financial analytics metrics like:
- total tax
- total revenue
- invoice count
- average invoice value
`,
   schema: {
  type: "object",
  properties: {
    metric: {
      type: "string",
      enum: [
        "total_tax",
        "total_revenue",
        "invoice_count",
        "average_invoice_value"
      ]
    },
    startDate: { type: "string" },
    endDate: { type: "string" }
  },
  required: ["metric"]
}
  }
);

module.exports = {getAnalyticsForInvoice}