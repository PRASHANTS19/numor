// to fill the db with chunks of text and their embeddings from the knowledge base files
// node src/modules/ai/chatbot/knowledgeBase/indexKnowledgeBase.js

require("dotenv/config");

const fs = require("fs");
const path = require("path");
const { Client } = require("pg");
const { GoogleGenerativeAIEmbeddings } = require("@langchain/google-genai");

const KNOWLEDGE_DIR = __dirname;
const TABLE_NAME = "knowledge_chunks";
const CHUNK_SIZE = 900;
const CHUNK_OVERLAP = 120;
const MAX_VECTOR_DIMENSIONS = 2000;

if (!process.env.VECTOR_DB_URL) {
  throw new Error("VECTOR_DB_URL is not defined in environment variables.");
}

if (!process.env.GEMINI_API_KEY) {
  throw new Error("GEMINI_API_KEY is not defined in environment variables.");
}

const embeddings = new GoogleGenerativeAIEmbeddings({
  apiKey: process.env.GEMINI_API_KEY,
  model: "gemini-embedding-001",
});

const vectorClient = new Client({
  connectionString: process.env.VECTOR_DB_URL,
});

function normalizeText(text) {
  return text
    .replace(/\r/g, "")
    .replace(/\t+/g, " ")
    .replace(/[ \u00A0]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function chunkText(text) {
  const normalized = normalizeText(text);
  if (!normalized) return [];

  const paragraphs = normalized
    .split(/\n\s*\n+/)
    .map((p) => p.trim())
    .filter(Boolean);

  const chunks = [];
  let current = "";

  for (const paragraph of paragraphs) {
    const candidate = current
      ? `${current}\n\n${paragraph}`
      : paragraph;

    if (candidate.length <= CHUNK_SIZE) {
      current = candidate;
      continue;
    }

    if (current) {
      chunks.push(current.trim());
    }

    const sentences = paragraph.match(/[^.!?]+[.!?]+|[^.!?]+$/g) || [paragraph];
    let sentenceBuffer = "";

    for (const sentence of sentences) {
      const candidateSentence = sentenceBuffer
        ? `${sentenceBuffer} ${sentence}`
        : sentence;

      if (candidateSentence.length <= CHUNK_SIZE) {
        sentenceBuffer = candidateSentence;
      } else {
        if (sentenceBuffer) {
          chunks.push(sentenceBuffer.trim());
        }
        sentenceBuffer = sentence;
      }
    }

    if (sentenceBuffer) {
      if (current && current.length + sentenceBuffer.length + 2 <= CHUNK_SIZE) {
        current = `${current}\n\n${sentenceBuffer}`;
      } else {
        chunks.push(sentenceBuffer.trim());
      }
    }
  }

  if (current) {
    chunks.push(current.trim());
  }

  // Apply overlap on the final chunk list
  const overlapped = [];
  for (let i = 0; i < chunks.length; i += 1) {
    const chunk = chunks[i];
    if (!chunk) continue;

    const start = Math.max(0, chunks[i - 1]?.length || 0);
    const end = Math.min(chunk.length, CHUNK_OVERLAP);
    const overlap = chunk.slice(0, end);

    overlapped.push({
      text: chunk,
      overlap,
      start,
    });
  }

  return overlapped.map((item) => item.text);
}

function normalizeEmbedding(raw) {
  if (!raw) return null;

  if (Array.isArray(raw)) {
    if (raw.length && Array.isArray(raw[0]) && raw[0].length) {
      return raw[0];
    }
    if (raw.length && typeof raw[0] === "number") {
      return raw;
    }
  }

  if (Array.isArray(raw?.embedding)) {
    return raw.embedding;
  }

  if (Array.isArray(raw?.data?.embedding)) {
    return raw.data.embedding;
  }

  if (Array.isArray(raw?.values)) {
    return raw.values;
  }

  return null;
}

async function ensureSchema() {
  await vectorClient.query(`
    CREATE EXTENSION IF NOT EXISTS vector;
  `);

  await vectorClient.query(`
    DROP INDEX IF EXISTS idx_${TABLE_NAME}_embedding;
  `);

  await vectorClient.query(`
    DROP TABLE IF EXISTS ${TABLE_NAME};
  `);

  await vectorClient.query(`
    CREATE TABLE ${TABLE_NAME} (
      id BIGSERIAL PRIMARY KEY,
      source_file TEXT NOT NULL,
      chunk_index INT NOT NULL,
      chunk_text TEXT NOT NULL,
      embedding vector(2000),
      metadata JSONB,
      created_at TIMESTAMP DEFAULT NOW()
    );
  `);

  await vectorClient.query(`
    CREATE INDEX IF NOT EXISTS idx_${TABLE_NAME}_embedding
    ON ${TABLE_NAME}
    USING hnsw (embedding vector_cosine_ops);
  `);
}

async function indexFile(filePath) {
  const fileName = path.basename(filePath);
  const rawText = fs.readFileSync(filePath, "utf8");
  const chunks = chunkText(rawText);

  if (!chunks.length) {
    console.log(`No chunks found in ${fileName}`);
    return;
  }

  await vectorClient.query(`
    DELETE FROM ${TABLE_NAME}
    WHERE source_file = $1;
  `, [fileName]);

  let indexedCount = 0;

  for (let i = 0; i < chunks.length; i += 1) {
    const chunk = chunks[i];

    let rawEmbedding;
    try {
      rawEmbedding = await embeddings.embedQuery(chunk);
    } catch (queryError) {
      try {
        const docResult = await embeddings.embedDocuments([chunk]);
        rawEmbedding = docResult?.[0];
      } catch (docError) {
        console.warn(
          `Skipping chunk ${i} in ${fileName} because embedding failed: ${docError.message}`
        );
        continue;
      }
    }

    const normalized = normalizeEmbedding(rawEmbedding);
    const vector = Array.isArray(normalized)
      ? normalized.slice(0, MAX_VECTOR_DIMENSIONS)
      : [];

    if (!vector.length) {
      console.warn(`Skipping chunk ${i} in ${fileName} because embedding is empty.`);
      continue;
    }

    const embeddingText = `[${vector.join(",")}]`;

    await vectorClient.query(
      `
        INSERT INTO ${TABLE_NAME} (
          source_file,
          chunk_index,
          chunk_text,
          embedding,
          metadata
        )
        VALUES ($1, $2, $3, $4::vector, $5)
      `,
      [
        fileName,
        i,
        chunk,
        embeddingText,
        {
          source_file: fileName,
          topic: path.parse(fileName).name,
          chunk_length: chunk.length,
        },
      ]
    );

    indexedCount += 1;
  }

  console.log(`Indexed ${indexedCount} chunks from ${fileName}`);
}

async function main() {
  try {
    await vectorClient.connect();
    await ensureSchema();

    const files = fs
      .readdirSync(KNOWLEDGE_DIR)
      .filter((file) => file.endsWith(".txt"))
      .sort();

    console.log(`Found ${files.length} text files to index`);

    for (const file of files) {
      await indexFile(path.join(KNOWLEDGE_DIR, file));
    }

    console.log("Knowledge base indexing complete.");
  } catch (error) {
    console.error("Knowledge base indexing failed:", error);
    process.exitCode = 1;
  } finally {
    await vectorClient.end();
  }
}

main();
