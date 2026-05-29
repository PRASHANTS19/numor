const fs = require("fs");
const path = require("path");
const Handlebars = require("handlebars");
const puppeteer = require("puppeteer");

const getTaxSystem = (country)=> {
  if (!country) return "";
  if (country === "India") return "GST";
  if (country === "United States" || country === "US") return "SALES";
  return "VAT";
};

const getTaxLabel = (country) => {
  const sys = getTaxSystem(country);
  if (sys === "GST") return "GSTIN";
  if (sys === "VAT") return "VATIN";
  if (sys === "SALES") return "Sales Tax ID";
  return "Tax ID (GST/VAT/Sales Tax)";
};

// In CommonJS, __dirname already exists
function generateInvoicePdf(invoice) {
  // console.log("Generating PDF for invoice:", invoice);
  return (async () => {
    // src/services -> src/templates
    const templatePath = path.join(__dirname, "../templates/invoice.html");

    if (!fs.existsSync(templatePath)) {
      throw new Error(`Invoice template not found at ${templatePath}`);
    }

    const html = fs.readFileSync(templatePath, "utf-8");
    const template = Handlebars.compile(html);
    const clientTaxLabel = getTaxLabel(invoice.client.country);
    const organizationLogoUrl = invoice.organizationLogoUrl || "";
    // console.log("Using organization logo URL:", organizationLogoUrl);
    const htmlWithData = template({
      ...invoice,
      clientTaxLabel,
      organizationLogoUrl,
      issueDate: invoice.issueDate.toISOString().split("T")[0],
      dueDate: invoice.dueDate.toISOString().split("T")[0],

      items: invoice.items?.map((item, index) => ({
        ...item,
        serialNo: index + 1,
      })),
    });

    const browser = await puppeteer.launch({ headless: "new" });
    // const browser = await puppeteer.launch({
    //   headless: "new",
    //   timeout: 60000,
    //   args: [
    //     "--no-sandbox",
    //     "--disable-setuid-sandbox",
    //     "--disable-dev-shm-usage",
    //     "--disable-gpu",
    //     "--no-zygote",
    //     "--single-process",
    //   ],
    // });


    const page = await browser.newPage();

    await page.setContent(htmlWithData, { waitUntil: "networkidle0" });

    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: {
        top: '10mm',
        bottom: '20mm',
        // left: '15mm',
        // right: '15mm'
      }
    });
    await browser.close();

    return pdfBuffer;
  })();
}

module.exports = {
  generateInvoicePdf,
};
