module.exports = function buildExpenseExcelPrompt(rows) {
  return `
You are an expert in parsing Tally Prime expense Excel exports.

You are given raw tabular data exported from Excel (JSON rows).
Column names and order may vary.

Rules:
- Output ONLY valid JSON
- Dates must be YYYY-MM-DD
- Numbers must be decimals (no currency symbols)
- If a value cannot be inferred, return null
- If multiple expenses exist, parse ONLY the first one
- Ensure totals are mathematically consistent
Every item MUST have a taxRate value.

If tax is specified at item level, use that value.

If tax is only available in a summary section (CGST, SGST, IGST, VAT, GST etc.):

- Calculate the combined tax percentage.
- Populate that percentage into EACH item.taxRate.
- Do not leave item.taxRate as 0 when a tax summary exists.

Examples:

CGST 9% + SGST 9%
=> item.taxRate = 18

IGST 18%
=> item.taxRate = 18

CGST 2.5% + SGST 2.5%
=> item.taxRate = 5

Hints:
- "Voucher No" → expenseNumber
- "Party Name" → seller.name
- "GSTIN/UIN" → gstin
- "Ledger" / "Stock Item" → item.name
- GST may be CGST/SGST or IGST (never both)

Expense JSON format:
${require("./expense.prompt")}

Excel rows:
${JSON.stringify(rows)}
`;
};
