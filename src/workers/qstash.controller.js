const invoicePdfService = require("./qstash.service");
const invoiceQstash = require("../queues/invoice.qstash");

exports.processInvoicePdf = async (req, res) => {
  const { invoiceId, sendEmail } = req.body;

  if (!invoiceId) {
    return res.status(400).json({ error: "invoiceId is required" });
  }

  try {
    await invoicePdfService.process(invoiceId, sendEmail);

    return res.status(200).json({
      success: true,
      invoiceId,
    });
  } catch (err) {
    console.error("PDF processing failed:", err);

    return res.status(500).json({
      error: "PDF generation failed",
    });
  }
};

exports.processInvoicePdfFailure = async (req, res) => {
  try {
    const result = await invoicePdfService.markInvoiceAsFailedFromDlq(req.body);

    return res.status(200).json({
      success: true,
      ...result,
    });
  } catch (err) {
    console.error("Failed to process QStash DLQ callback:", err);

    return res.status(500).json({
      success: false,
      error: "DLQ callback processing failed",
    });
  }
};


