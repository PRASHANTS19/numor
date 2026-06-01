// invoice.controller.js
const { ca } = require('zod/locales');
const invoiceService = require('./invoice.service');
const { sendResponse } = require('../../utils/response');


exports.previewInvoice = async function (req, res, next) {
  try {
    // const filePath = req.file.path;
    const result = await invoiceService.previewInvoiceAI(req.file);

    return sendResponse(res, 200, { data: result });
  } catch (err) {
    next(err);
  }
}

exports.confirmAndSaveInvoice = async function (req, res, next) {
  try {
    const payload = req.body;
    const user = req.user; // from auth middleware

    const invoice = await invoiceService.saveInvoiceFromPreview(user, payload);

    return sendResponse(res, 200, { data: { invoice } });
  } catch (err) {
    console.error('Error in confirmOCR:', err);
    err.statusCode = err.statusCode || 400;
    next(err);
  }
};

exports.listInvoices = async function (req, res, next) {
  try {
    const { page, limit, startDate, endDate } = req.query;
    const user = req.user;
    const invoices = await invoiceService.listInvoices(user, Number(page), Number(limit), startDate, endDate);
    return sendResponse(res, 200, { data: invoices });
  } catch (err) {
    console.error('Error in listInvoices:', err);
    next(err);
  }
}

exports.listCustomFields = async function (req, res, next) {
  try {
    const data = await invoiceService.listCustomFieldDefinitions(req.user);
    return sendResponse(res, 200, { data });
  } catch (err) {
    console.error('Error in listCustomFields:', err);
    next(err);
  }
}

exports.listInvoiceProduct = async function (req, res, next) {
  try {
    const { page, limit } = req.query;
    const products = await invoiceService.listInvoiceProducts(req.params.id, Number(page), Number(limit));
    return sendResponse(res, 200, { data: products });
  } catch (err) {
    console.error('Error in listInvoiceProduct:', err);
    next(err);
  }
}

exports.confirmAndUpdateInvoice = async function (req, res, next) {
  try {
    const payload = req.body;
    const user = req.user; // from auth middleware
    const id = BigInt(req.params.id);

    const invoice = await invoiceService.updateInvoice(user, id, payload);

    return sendResponse(res, 200, {
      data: invoice
    });
  } catch (err) {
    console.error('Error in confirmAndUpdateInvoice:', err);
    err.statusCode = err.statusCode || 400;
    next(err);
  }
};

exports.confirmAndCreateInvoice = async function (req, res, next) {
  try {
    const user = req.user;
    const payload = req.body;

    const sendEmail = req.query.sendEmail === "true";
    const invoice = await invoiceService.confirmAndCreateInvoice(user, payload, sendEmail);

    return sendResponse(res, 201, {
      data: invoice
    });
  } catch (err) {
    console.error('Error in confirmAndCreateInvoice:', err);
    err.statusCode = err.statusCode || 400;
    next(err);
  }
};


exports.getInvoice = async (req, res, next) => {
  try {
    const invoice = await invoiceService.getInvoice(req.user, req.params.id);
    return sendResponse(res, 200, {
      data: invoice
    });
  } catch (err) {
    console.error('Error in getInvoice:', err);
    err.statusCode = err.statusCode || 400;
    next(err);
  }
};

exports.getInvoicePdf = async (req, res, next) => {
  try {
    const result = await invoiceService.getSignedPdfUrl(
      req.user,
      req.params.id
    );

    // Map status to HTTP status code
    const statusMap = {
      'INVOICE_NOT_FOUND': 404,
      'NOT_STARTED': 202,
      'QUEUED': 202,
      'PROCESSING': 202,
      'READY': 200,
      'FAILED': 500,
      'NOT_GENERATED': 500
    };

    const httpStatus = statusMap[result.status] || 500;
    return sendResponse(res, httpStatus, {
      success: httpStatus < 400,
      message: result.message || "",
      data: result,
    });
  } catch (err) {
    next(err);
  }
};

exports.streamInvoicePdfStatus = (req, res) => {
  invoiceService.openStream({
    req,
    res,
    userId: req.user.userId,
    invoiceId: req.params.id
  });
};

exports.deleteInvoice = async (req, res, next) => {
  try {
    const user = req.user;
    const id = req.params.id;

    const result = await invoiceService.deleteInvoice(user, id);

    return sendResponse(res, 200, {
      data: result
    });
  } catch (err) {
    console.error('Error in deleteInvoice:', err);
    err.statusCode = err.statusCode || 400;
    next(err);
  }
};

exports.exportInvoices = async (req, res, next) => {
  try {
    const { startDate, endDate, format = "csv", includeItems } = req.query;

    const includeItemsBool = includeItems === "true";

    const file = await invoiceService.exportInvoices(
      req.user,
      startDate,
      endDate,
      format,
      includeItemsBool
    );

    if (format === "excel") {
      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      );
      res.setHeader(
        "Content-Disposition",
        "attachment; filename=invoices.xlsx"
      );
      return res.send(file);
    }

    res.setHeader("Content-Type", "text/csv");
    res.setHeader(
      "Content-Disposition",
      "attachment; filename=invoices.csv"
    );

    return res.send(file);

  } catch (err) {
    console.error("Export Invoice Error:", err);
    next(err);
  }
};
