module.exports = function buildInvoiceExcelPrompt(rows) {
  return `
You are an expert in parsing Tally Prime invoice Excel exports.

You are given raw tabular data exported from Excel (JSON rows).
Column names and order may vary.

Rules:
- Output ONLY valid JSON
- Dates must be YYYY-MM-DD
- Numbers must be decimals (no currency symbols)
- If a value cannot be inferred, return null
- If multiple invoices exist, parse ONLY the first one
- Ensure totals are mathematically consistent
- If tax rates (e.g., CGST, SGST, IGST) are provided as global totals for the overall invoice, sum these percentages together and distribute the combined tax rate to all items in the invoice.

Hints:
- "Voucher No" → invoiceNumber
- "Party Name" → buyer.name
- "GSTIN/UIN" → gstin
- "Ledger" / "Stock Item" → item.name
- GST may be CGST/SGST or IGST (never both)
- Any other specific fields, custom attributes, or non-standard headers from the Excel rows should be captured inside the "customFields" array.


Invoice JSON format:
${require("./invoice.prompt")}

Excel rows:
${JSON.stringify(rows)}
`;
};
