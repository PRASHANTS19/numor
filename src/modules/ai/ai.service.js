const fetch = require('node-fetch');
const invoicePrompt = require('./prompts/invoice.prompt');
const expensePromt = require('./prompts/expense.prompt');
const fs = require("fs");

const GEMINI_ENDPOINT = 'https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent';

function extractJson(text) {
  // Try to extract JSON object from AI response
  const match = text.match(/\{[\s\S]*\}/);

  if (!match) {
    throw new Error('No JSON found in Gemini response');
  }

  return JSON.parse(match[0]);
}

async function parseInvoiceFromImage(filePath) {
  const imageBase64 = fs.readFileSync(filePath, {
    encoding: "base64",
  });

  const prompt = `
You are an expert invoice parser.
Analyze the invoice image and return ONLY valid JSON.

Required fields:
- vendorName
- invoiceDate
- totalAmount
- taxAmount
- currency
- lineItems [{ description, quantity, unitPrice, amount }]
- confidence (0–1)

If any field is missing, return null.
`;

  const response = await fetch(
    `${GEMINI_ENDPOINT}?key=${process.env.GEMINI_API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [
              { text: prompt },
              {
                inline_data: {
                  mime_type: "image/jpeg", // or image/png
                  data: imageBase64,
                },
              },
            ],
          },
        ],
      }),
    }
  );

  const data = await response.json();

  const text =
    data?.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!text) {
    throw new Error("Gemini returned empty response");
  }

  try {
    return extractJson(text);
  } catch (err) {
    console.error("❌ GEMINI RAW RESPONSE:\n", text);
    throw err;
  }
}

module.exports = {
  parseInvoiceFromImage,
};

async function parseInvoice(ocrText) {
  const prompt = invoicePrompt(ocrText);

  const response = await fetch(
    `${GEMINI_ENDPOINT}?key=${process.env.GEMINI_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          {
            role: 'user',
            parts: [{ text: prompt }],
          },
        ],
      }),
    }
  );

  const data = await response.json();

  const text =
    data?.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!text) throw new Error('Gemini returned empty response');
  try {
    return extractJson(text);
  } catch (err) {
    console.error('❌ GEMINI RAW RESPONSE:\n', text);
    throw err;
  }
  return JSON.parse(text);
}

async function parseExpense(ocrText) {
  const prompt = expensePromt(ocrText);

  const response = await fetch(
    `${GEMINI_ENDPOINT}?key=${process.env.GEMINI_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          {
            role: 'user',
            parts: [{ text: prompt }],
          },
        ],
      }),
    }
  );

  const data = await response.json();

  const text =
    data?.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!text) throw new Error('Gemini returned empty response');
  try {
    return extractJson(text);
  } catch (err) {
    console.error('❌ GEMINI RAW RESPONSE:\n', text);
    throw err;
  }
  return JSON.parse(text);
}

module.exports = { parseInvoice, parseExpense, parseInvoiceFromImage };
