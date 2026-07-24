require("dotenv/config");

const { Client } = require("pg");
const { GoogleGenerativeAIEmbeddings } = require("@langchain/google-genai");

const vectorClient = new Client({
  connectionString: process.env.VECTOR_DB_URL,
});

const embeddings = new GoogleGenerativeAIEmbeddings({
  apiKey: process.env.GEMINI_API_KEY,
  model: "gemini-embedding-001",
});

async function ensureVectorClientConnected() {
  if (!vectorClient._connected) {
    await vectorClient.connect();
  }
}

function normalizeEmbedding(raw) {
  if (!raw) return null;

  if (Array.isArray(raw)) {
    if (Array.isArray(raw[0]) && raw[0].length) {
      return raw[0];
    }
    if (raw.every((item) => typeof item === "number")) {
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

async function retrieveKnowledge(query, limit = 5) {
  await ensureVectorClientConnected();

  const rawEmbedding = await embeddings.embedQuery(query);
  const normalized = normalizeEmbedding(rawEmbedding);

  if (!Array.isArray(normalized) || !normalized.length) {
    return [];
  }

  const sliced = normalized.slice(0, 2000);
  const embeddingText = `[${sliced.join(",")}]`;

  const result = await vectorClient.query(
    `
      SELECT
        chunk_text,
        source_file,
        chunk_index,
        metadata,
        1 - (embedding <=> $1::vector) AS similarity
      FROM knowledge_chunks
      ORDER BY embedding <=> $1::vector
      LIMIT $2;
    `,
    [embeddingText, limit]
  );

  return result.rows;
}

module.exports = { retrieveKnowledge };
