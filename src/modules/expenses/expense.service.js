const prisma = require('../../config/database');
const ocrService = require('../../services/ocr.service');
const aiService = require('../ai/ai.service');
const fs = require("fs");
const storageService = require("../../storage/storage.service");
const { Prisma } = require("@prisma/client");

function isExcelFile(mimetype, filename) {
  if (mimetype === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
    mimetype === "application/vnd.ms-excel") {
    return true;
  }
  if (typeof filename === 'string' &&
    (filename.endsWith('.xlsx') || filename.endsWith('.xls'))) {
    return true;
  }
  return false;
}

function isCsvFile(mimetype, filename) {
  return (
    mimetype === 'text/csv' ||
    mimetype === 'application/csv' ||
    (typeof filename === 'string' && filename.endsWith('.csv'))
  );
}

async function uploadExpenseFile(file) {
  const buffer = await fs.promises.readFile(file.path);
  const key = `expenses/${Date.now()}-${file.originalname}`;

  await storageService.upload(key, buffer);

  return key; // 👈 return this
}


// exports.previewExpenseAI = async function (file) {
//   const { path, mimetype, originalname } = file;
//   //Excel 
//   if (isExcelFile(mimetype, originalname)) {
//     const parsed = await aiService.parseExpenseFromExcel(path);
//     return {
//       source: "gemini-vision-excel",
//       parsedData: parsed,
//       confidence: parsed.confidence || null,
//     };
//   }

//   if (isCsvFile(mimetype, originalname)) {
//     const parsed = await aiService.parseExpenseFromCsv(path);
//     return {
//       source: "gemini-vision-csv",
//       parsedData: parsed,
//       confidence: parsed.confidence || null,
//     };
//   }


//   //Pdf and Image
//   const parsed = await aiService.parseExpenseFromFile(path);

//   return {
//     source: "gemini-vision",
//     parsedData: parsed,
//     confidence: parsed.confidence || null,
//   };
//   return {
//     source: "gemini-vision",
//     parsedData: parsed,
//     confidence: parsed.confidence || null,
//   };
// }

exports.previewExpenseAI = async function (file) {
  const { path, mimetype, originalname } = file;

  let parsed;
  let source = "gemini-vision";

  if (isExcelFile(mimetype, originalname)) {
    parsed = await aiService.parseExpenseFromExcel(path);
    source = "gemini-vision-excel";
  } else if (isCsvFile(mimetype, originalname)) {
    parsed = await aiService.parseExpenseFromCsv(path);
    source = "gemini-vision-csv";
  } else {
    parsed = await aiService.parseExpenseFromFile(path);
  }

  if (!parsed || !parsed.items?.length) {
    throw new Error("Expense parsing failed");
  }

  // 🔥 Upload after successful parse
  const buffer = await fs.promises.readFile(path);
  const key = `expenses/${Date.now()}-${originalname}`;
  await storageService.upload(key, buffer);
  await fs.promises.unlink(path); 

  parsed.receiptUrl = key;

  return {
    source,
    parsedData: parsed,
    confidence: parsed.confidence || null,
  };
};


// exports.saveExpenseFromPreview = async (user, payload) => {
//   return prisma.$transaction(async (tx) => {

//     // 1️⃣ Create expense bill
//     const expense = await tx.expenseBill.create({
//       data: {
//         orgId: BigInt(user.orgId),
//         userId: BigInt(user.userId),
//         merchant: payload.merchant ?? null,
//         expenseDate: payload.expenseDate
//           ? new Date(payload.expenseDate)
//           : new Date(),
//         totalAmount: payload.totalAmount,
//         category: payload.category ?? 'OTHER',
//         paymentMethod: payload.paymentMethod ?? "CASH",
//         receiptUrl: payload.receiptUrl ?? null,
//         ocrExtracted: true,
//         ocrConfidence: payload.confidence ?? null,
//       },
//     });

//     // 2️⃣ Create expense items
//     if (Array.isArray(payload.items)) {
//       for (const item of payload.items) {
//         await tx.expenseBillItem.create({
//           data: {
//             expenseId: expense.id, // ✅ IMPORTANT
//             itemName: item.name ?? null,
//             quantity: item.quantity ?? 1,
//             unitPrice: item.unitPrice ?? 0,
//             unitType: item.unitType ?? "UNIT",
//             taxRate: item.taxRate ?? 0,
//             totalPrice: item.total ?? 0,
//           },
//         });
//       }
//     }

//     return expense;
//   });
// };
exports.saveExpenseFromPreview = async (user, payload) => {
  return prisma.$transaction(async (tx) => {

    let totalTax = new Prisma.Decimal(0);
    let subtotal = new Prisma.Decimal(0);

    const itemsData = [];

    if (Array.isArray(payload.items)) {
      for (const item of payload.items) {

        const quantity = new Prisma.Decimal(item.quantity ?? 1);
        const unitPrice = new Prisma.Decimal(item.unitPrice ?? 0);
        const taxRate = new Prisma.Decimal(item.taxRate ?? 0);

        const itemTotal = quantity.mul(unitPrice);
        const itemTax = itemTotal.mul(taxRate).div(100);

        subtotal = subtotal.add(itemTotal);
        totalTax = totalTax.add(itemTax);

        itemsData.push({
          itemName: item.name ?? null,
          quantity,
          unitPrice,
          unitType: item.unitType ?? "UNIT",
          taxRate,
          totalPrice: itemTotal, // store calculated total (safe)
        });
      }
    }

    // Optional: If you want auto-calculated grand total
    const grandTotal = subtotal.add(totalTax);

    const expense = await tx.expenseBill.create({
      data: {
        orgId: BigInt(user.orgId),
        userId: BigInt(user.userId),
        merchant: payload.merchant ?? null,
        expenseDate: payload.expenseDate
          ? new Date(payload.expenseDate)
          : new Date(),
        totalAmount: new Prisma.Decimal(
          payload.totalAmount ?? grandTotal
        ),
        totalTax,
        category: payload.category ?? "OTHER",
        paymentMethod: payload.paymentMethod ?? "CASH",
        receiptUrl: payload.receiptUrl ?? null,
        ocrExtracted: true,
        ocrConfidence: payload.confidence
          ? new Prisma.Decimal(payload.confidence)
          : null,
        // 🔥 Nested create (single DB roundtrip)
        items: {
          create: itemsData,
        },
      },
      include: {
        items: true,
      },
    });

    return expense;
  });
};


exports.listExpenses = async (user, page = 1, limit = 10, startDate, endDate) => {
  page = Number(page);
  limit = Number(limit);

  if (Number.isNaN(page) || page < 1) page = 1;
  if (Number.isNaN(limit) || limit < 1) limit = 10;
  const offset = (page - 1) * limit;

    // Build dynamic where condition
    const where = {
        userId: BigInt(user.userId),
    };
    // Add date filter only if provided
    if (startDate || endDate) {
        where.expenseDate = {};

        if (startDate) {
            where.expenseDate.gte = new Date(startDate);
        }

        if (endDate) {
            // Optional: make endDate inclusive for whole day
            const end = new Date(endDate);
            end.setHours(23, 59, 59, 999);
            where.expenseDate.lte = end;
        }
    }
  return prisma.expenseBill.findMany({
    where,
    include: {
      items: true,
    },
    orderBy: {
      createdAt: 'desc',
    },
    take: limit,
    skip: offset,
  });
};

exports.getExpense = async (user, id) => {
  return prisma.expenseBill.findFirstOrThrow({
    where: { id: BigInt(id), orgId: user.orgId }
  });
};

exports.listExpenseItems = async (expenseId, page = 1, limit = 10) => {
  page = Number(page);
  limit = Number(limit);

  if (Number.isNaN(page) || page < 1) page = 1;
  if (Number.isNaN(limit) || limit < 1) limit = 10;
  const offset = (page - 1) * limit;
  return prisma.expenseBillItem.findMany({
    where: {
      expenseId: BigInt(expenseId),
    },
    take: limit,
    skip: offset,
  });
};

exports.updateExpense = async (user, expenseId, payload) => {
  return prisma.$transaction(async (tx) => {

    const expense = await tx.expenseBill.findFirst({
      where: {
        id: BigInt(expenseId),
        userId: BigInt(user.userId),
      },
    });

    if (!expense) {
      throw new Error("Expense not found");
    }

    // 1️⃣ Update main expense
    await tx.expenseBill.update({
      where: { id: expense.id },
      data: {
        merchant: payload.merchant ?? expense.merchant,
        expenseDate: payload.expenseDate
          ? new Date(payload.expenseDate)
          : expense.expenseDate,
        totalAmount: payload.totalAmount ?? expense.totalAmount,
        category: payload.category ?? expense.category,
        paymentMethod: payload.paymentMethod ?? expense.paymentMethod,
      },
    });

    // 2️⃣ Replace items (cleanest approach)
    if (Array.isArray(payload.items)) {
      await tx.expenseBillItem.deleteMany({
        where: { expenseId: expense.id },
      });

      await tx.expenseBillItem.createMany({
        data: payload.items.map(item => ({
          expenseId: expense.id,
          itemName: item.name ?? null,
          quantity: item.quantity ?? 1,
          unitPrice: item.unitPrice ?? 0,
          unitType: item.unitType ?? "UNIT",
          taxRate: item.taxRate ?? 0,
          totalPrice: item.total ?? 0,
        })),
      });
    }

    return { message: "Expense updated successfully" };
  });
};

exports.deleteExpense = async (user, expenseId) => {
  return prisma.$transaction(async (tx) => {

    const expense = await tx.expenseBill.findFirst({
      where: {
        id: BigInt(expenseId),
        userId: BigInt(user.userId),
      },
    });

    if (!expense) {
      throw new Error("Expense not found");
    }

    await tx.expenseBill.delete({
      where: { id: expense.id },
    });

    return { message: "Expense deleted successfully" };
  });
};

exports.getSignedUrl = async(user, id) => {
    const expense = await prisma.expenseBill.findFirst({
        where: {
            id: BigInt(id),
            orgId: user.orgId
        }
    });

    if (!expense) {
        return {
            success: false,
            status: 'EXPENSE_NOT_FOUND',
            message: 'Expense not found'
        };
    }

    if (!expense.receiptUrl) {
        return {
            success: false,
            status: 'FAILED',
            message: 'PDF not available'
        };
    }

    const storage = require('../../storage/storage.service');
    const url = await storage.getSignedUrl(expense.receiptUrl);
    return {
        success: true,
        status: 'READY',
        url
    };
}