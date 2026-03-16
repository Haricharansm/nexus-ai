import { Pool } from 'pg'

const pool = new Pool({
  connectionString: process.env.POSTGRES_CONNECTION_STRING,
  ssl: process.env.NODE_ENV === 'production'
    ? { rejectUnauthorized: false }
    : false,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
})

export async function query(text: string, params?: unknown[]) {
  const res = await pool.query(text, params)
  return res
}

export async function searchSimilarDocuments(
  queryEmbedding: number[],
  matchCount = 5,
  filterTag?: string
) {
  const result = await query(
    'SELECT * FROM match_documents($1::vector, $2, $3)',
    [`[${queryEmbedding.join(',')}]`, matchCount, filterTag ?? null]
  )
  return result.rows
}

export default pool
