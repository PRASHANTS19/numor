SELECT current_database();

CREATE EXTENSION vector;

SELECT extname, extversion
FROM pg_extension
WHERE extname = 'vector';

CREATE TABLE knowledge_chunks (
  id SERIAL PRIMARY KEY,
  source_file TEXT NOT NULL,
  chunk_text TEXT NOT NULL,
  embedding vector(768),
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);