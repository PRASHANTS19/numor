const invoicePdfService = require("./qstash.service");
const invoiceQstash = require("../queues/invoice.qstash");
const { sendResponse } = require("../utils/response");

exports.processInvoicePdf = async (req, res, next) => {
  const { invoiceId, sendEmail } = req.body;

  if (!invoiceId) {
    const error = new Error("invoiceId is required");
    error.statusCode = 400;
    return next(error);
  }

  try {
    await invoicePdfService.process(invoiceId, sendEmail);

    return sendResponse(res, 200, {
      data: { invoiceId },
    });
  } catch (err) {
    console.error("PDF processing failed:", err);

    err.message = err.message || "PDF generation failed";
    next(err);
  }
};

exports.processInvoicePdfFailure = async (req, res, next) => {
  try {
    const result = await invoicePdfService.markInvoiceAsFailedFromDlq(req.body);

    return sendResponse(res, 200, { data: result });
  } catch (err) {
    console.error("Failed to process QStash DLQ callback:", err);

    err.message = err.message || "DLQ callback processing failed";
    next(err);
  }
};

