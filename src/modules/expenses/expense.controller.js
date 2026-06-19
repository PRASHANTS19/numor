// expense.controller.js
const { ca } = require('zod/locales');
const expenseService = require('./expense.service');
const { sendResponse } = require('../../utils/response');

exports.parseExpense = async function (req, res, next) {
  // const filePath = req.file.path;
  try {

  const result = await expenseService.previewExpenseAI(req.file);
  console.log('Parsed Expense Result:', result);
  return sendResponse(res, 200, { data: result });
  }
  catch (err) {
    console.log('Error in prase Expense:', err);
    next(err);
  }

}

exports.previewOCR = async function (req, res, next) {
  try {
    const filePath = req.file.path;

    const preview = await expenseService.previewExpenseOCR(filePath);
    return sendResponse(res, 200, { data: preview });
  } catch (err) {
    console.log('Error in previewOCR:', err);
    next(err);
  }
}

exports.confirmExpense = async function (req, res, next) {
  try {
    const payload = req.body;
    const user = req.user;
    const expense = await expenseService.saveExpenseFromPreview(user, payload);
    return sendResponse(res, 200, { data: { expense } });
  } catch (err) {
    console.error('Error in confirmExpense:', err);
    err.statusCode = err.statusCode || 400;
    next(err);
  }
};

exports.listExpenses = async function (req, res, next) {
  try {
    const { limit, page, startDate, endDate } = req.query;
    const user = req.user;
    const expenses = await expenseService.listExpenses(user, Number(page), Number(limit), startDate, endDate);
    return sendResponse(res, 200, { data: expenses });
  } catch (err) {
    console.error('Error in listExpenses:', err);
    next(err);
  }
}


exports.getExpense = async (req, res, next) => {
  try {
    const expense = await expenseService.getExpense(req.user, req.params.id);
    return sendResponse(res, 200, {
      data: expense
    });
  } catch (err) {
    console.error('Error in getexpense:', err);
    err.statusCode = err.statusCode || 400;
    next(err);
  }
};

exports.listExpenseItems = async function (req, res, next) {
  try {
    const { page, limit } = req.query;
    const products = await expenseService.listExpenseItems(req.params.id, Number(page), Number(limit));
    return sendResponse(res, 200, { data: products });
  } catch (err) {
    console.error('Error in listExpenseItems:', err);
    next(err);
  }
}

exports.updateExpense = async function (req, res, next) {
  try {
    const payload = req.body;
    const user = req.user;
    const id = BigInt(req.params.id);

    const expense = await expenseService.updateExpense(user, id, payload);

    return sendResponse(res, 200, {
      data: expense
    });
  } catch (err) {
    console.error('Error in updateExpense:', err);
    err.statusCode = err.statusCode || 400;
    next(err);
  }
};

exports.deleteExpense = async (req, res, next) => {
  try {
    const user = req.user;
    const id = req.params.id;

    const result = await expenseService.deleteExpense(user, id);

    return sendResponse(res, 200, {
      data: result
    });
  } catch (err) {
    console.error('Error in deleteExpense:', err);
    err.statusCode = err.statusCode || 400;
    next(err);
  }
};

exports.getExpenseReceipt = async (req, res, next) => {
  try {
    const result = await expenseService.getSignedUrl(
      req.user,
      req.params.id
    );

    // Map status to HTTP status code
    const statusMap = {
      'EXPENSE_NOT_FOUND': 404,
      'READY': 200,
      'FAILED': 500,
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

exports.exportExpenses = async (req, res, next) => {
  try {
    const { startDate, endDate, format = "csv", includeItems } = req.query;

    const includeItemsBool = includeItems === "true";

    const file = await expenseService.exportExpenses(
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
      res.setHeader("Content-Disposition", "attachment; filename=expenses.xlsx");

      return res.send(file);
    }

    // CSV
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", "attachment; filename=expenses.csv");

    return res.send(file);

  } catch (err) {
    console.error(err);
    next(err);
  }
};
