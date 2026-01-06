import fs from "fs";
import path from "path";
import Handlebars from "handlebars";
import puppeteer from "puppeteer";
import { fileURLToPath } from "url";

// Needed because you're using ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function generateInvoicePdf(invoice) {
  // src/services -> src/templates
  const templatePath = path.join(__dirname, "../templates/invoice.html");

  if (!fs.existsSync(templatePath)) {
    throw new Error(`Invoice template not found at ${templatePath}`);
  }

  const html = fs.readFileSync(templatePath, "utf-8");

  const template = Handlebars.compile(html);

  const htmlWithData = template({
    ...invoice,
    issueDate: invoice.issueDate.toISOString().split("T")[0],
    dueDate: invoice.dueDate.toISOString().split("T")[0]
  });

  const browser = await puppeteer.launch({ headless: "new" });
  const page = await browser.newPage();

  await page.setContent(htmlWithData, { waitUntil: "networkidle0" });

  const pdfBuffer = await page.pdf({ format: "A4" });
  await browser.close();

  return pdfBuffer;
}
