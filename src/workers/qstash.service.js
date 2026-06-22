
const prisma = require("../config/database");
const pdfService = require("../services/pdf.service");
const storage = require("../storage/storage.service");
const emailService = require('../services/email.service');
const { content } = require("googleapis/build/src/apis/content");

exports.process = async (invoiceId, sendEmail) => {
  const id = BigInt(invoiceId);

  // 🔒 Idempotency guard
  const invoice = await prisma.invoiceBill.findUnique({
    where: { id },
    include: { items: true, organization: true, client: true, customer: true, customFields: { include: { customField: true } } },
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

  let organizationLogoUrl = "";
  if (invoice.organization?.logoUrl) {
    try {
      organizationLogoUrl = await storage.getSignedUrl(invoice.organization.logoUrl);
    } catch (error) {
      console.warn("Could not sign organization logo URL:", error.message);
    }
  }

  const pdfBuffer = await pdfService.generateInvoicePdf({
    ...invoice,
    organizationLogoUrl,
  });

  const path = `invoices/${invoice.orgId}/${invoice.invoiceNumber}.pdf`;
  const pdfKey = await storage.upload(path, pdfBuffer);
  // console.log("sendEmail flag in process function:", sendEmail);
  if (sendEmail) {
    try {
      if (!invoice.customer?.email) {
        console.warn("Skipping email: customer email missing");
        return;
      }
      console.log(`Sending invoice email to ${invoice.customer?.email} with PDF key ${pdfKey}`);

      const cleanBuffer = Buffer.from(pdfBuffer);
      const base64Pdf = cleanBuffer.toString("base64");

      const customerName = invoice.customer?.name || "there";

      const subject = `Invoice ${invoice.invoiceNumber} from Numor`;

      const html = `
      <p>Hi ${customerName},</p>
      <p>Your invoice <strong>#${invoice.invoiceNumber}</strong> is ready.</p>
      <p>Please find the invoice attached to this email.</p>
      <br/>
      <p>
        Thanks,<br/>
        <strong>Team Numor</strong><br/>
        <a href="https://numor.app">https://numor.app</a>
      </p>
    `;
      const text = `
        Hi ${customerName},
        Your invoice #${invoice.invoiceNumber} is ready.
        Please find the invoice attached.
        If you have any questions, just reply to this email.
        Thanks,
        Team Numor
        https://numor.app
        `;

      const res = await emailService.sendEmailWithAttachment({
        to: invoice.customer.email,
        subject,
        html,
        text,
        attachments: [
          {
            filename: `Invoice-${invoice.invoiceNumber}.pdf`,
            content: base64Pdf,
          },
        ],
      });

      console.log("Email sent response:", res);

    } catch (err) {
      console.error("Email sending failed:", {
        message: err.message,
        stack: err.stack,
        invoiceId: invoice.id,
      });
    }
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

function parsePayloadBody(body) {
  if (!body) return null;

  if (typeof body === "object") {
    return body;
  }

  if (typeof body === "string") {
    try {
      return JSON.parse(body);
    } catch {
      return null;
    }
  }

  return null;
}

exports.markInvoiceAsFailedFromDlq = async (payload) => {
  const parsedBody = parsePayloadBody(payload?.body);
  console.log("Parsed DLQ payload body:", parsedBody);
  const invoiceId =
    payload?.invoiceId ??
    parsedBody?.invoiceId;

  if (!invoiceId) {
    return { updated: false, reason: "invoiceId_not_found" };
  }

  const id = BigInt(invoiceId);

  await prisma.invoiceBill.update({
    where: { id },
    data: { pdfStatus: "DRAFT" },
  });

  return { updated: true, invoiceId: id.toString() };
};



async function handleInvoice(invoiceId) {
  await prisma.invoiceBill.update({
    where: { id: BigInt(invoiceId) },
    data: { pdfStatus: 'PROCESSING' }
  });

  const invoice = await prisma.invoiceBill.findUnique({
    where: { id: BigInt(invoiceId) },
    include: { items: true, organization: true, client: true, customFields: { include: { customField: true } } }
  });

  if (!invoice || invoice.pdfStatus === 'READY') return;

  let organizationLogoUrl = "";
  if (invoice.organization?.logoUrl) {
    try {
      organizationLogoUrl = await storage.getSignedUrl(invoice.organization.logoUrl);
    } catch (error) {
      console.warn("Could not sign organization logo URL:", error.message);
    }
  }

  const pdfBuffer = await pdfService.generateInvoicePdf({
    ...invoice,
    organizationLogoUrl,
  });

  const path = `invoices/${invoice.orgId}/${invoice.invoiceNumber}.pdf`;
  const pdfKey = await storage.upload(path, pdfBuffer);

  await prisma.invoiceBill.update({
    where: { id: BigInt(invoiceId) },
    data: { pdfStatus: 'READY', pdfKey }
  });
}
