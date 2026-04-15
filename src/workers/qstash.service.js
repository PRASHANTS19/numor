
const prisma = require("../config/database");
const pdfService = require("../services/pdf.service");
const storage = require("../storage/storage.service");
const emailService = require('../services/email.service');
const { content } = require("googleapis/build/src/apis/content");

exports.process = async (invoiceId) => {
  const id = BigInt(invoiceId);

  // 🔒 Idempotency guard
  const invoice = await prisma.invoiceBill.findUnique({
    where: { id },
    include: { items: true, organization: true, client: true, customer: true },
  });

  if (!invoice) {
    throw new Error(`Invoice not found: ${invoiceId}`);
  }

  if (invoice.pdfStatus === "READY") {
    return; // already processed
  }

  await prisma.invoiceBill.update({
    where: { id },
    data: { pdfStatus: "PROCESSING" },
  });

  const pdfBuffer = await pdfService.generateInvoicePdf(invoice);

  const path = `invoices/${invoice.orgId}/${invoice.invoiceNumber}.pdf`;
  const pdfKey = await storage.upload(path, pdfBuffer);

  try {
    const fs = require("fs");
    const path = require("path");
    const tempPath = path.join(__dirname, "temp.pdf");
    fs.writeFileSync(tempPath, pdfBuffer);
    const base64Pdf = fs.readFileSync(tempPath).toString("base64");

    console.log(`Sending invoice email to ${invoice.customer?.email} with PDF key ${pdfKey}`);
    // const base64Pdf = pdfBuffer.toString("base64");
    // const fs = require("fs");
    // fs.writeFileSync("debug.pdf", pdfBuffer);
    const res = await emailService.sendEmailWithAttachment({
      to: invoice.customer?.email,
      subject: `Invoice ${invoice.invoiceNumber}`,
      html: `<p>Your invoice is attached.</p>`,
      attachments: [
        {
          filename: `${invoice.invoiceNumber}.pdf`,
          content: base64Pdf,
          // content: pdfBuffer.toString("base64"),
          // type: "application/pdf",
          // encoding: "base64",
        },
      ],
    });
    console.log("Email sent response:", res);

  } catch (err) {
    console.error("Email sending failed:", err);
  }


  await prisma.invoiceBill.update({
    where: { id },
    data: {
      pdfStatus: "READY",
      pdfKey,
      status: "UNPAID", // Update status to UNPAID when PDF is ready
    },
  });
};



async function handleInvoice(invoiceId) {
  await prisma.invoiceBill.update({
    where: { id: BigInt(invoiceId) },
    data: { pdfStatus: 'PROCESSING' }
  });

  const invoice = await prisma.invoiceBill.findUnique({
    where: { id: BigInt(invoiceId) },
    include: { items: true, organization: true, client: true }
  });

  if (!invoice || invoice.pdfStatus === 'READY') return;

  const pdfBuffer = await pdfService.generateInvoicePdf(invoice);

  const path = `invoices/${invoice.orgId}/${invoice.invoiceNumber}.pdf`;
  const pdfKey = await storage.upload(path, pdfBuffer);

  await prisma.invoiceBill.update({
    where: { id: BigInt(invoiceId) },
    data: { pdfStatus: 'READY', pdfKey }
  });
}
