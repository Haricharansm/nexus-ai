const VOYAGE_API_URL = 'https://api.voyageai.com/v1/embeddings'
const BATCH_SIZE = 128

export async function embedTexts(texts: string[]): Promise<number[][]> {
  const embeddings: number[][] = []

  for (let i = 0; i < texts.length; i += BATCH_SIZE) {
    const batch = texts.slice(i, i + BATCH_SIZE)

    const response = await fetch(VOYAGE_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.VOYAGE_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'voyage-2',
        input: batch,
      }),
    })

    if (!response.ok) {
      const err = await response.text()
      throw new Error(`Voyage AI error: ${err}`)
    }

    const data = await response.json()
    embeddings.push(...data.data.map((d: { embedding: number[] }) => d.embedding))
  }

  return embeddings
}

export async function embedQuery(text: string): Promise<number[]> {
  const results = await embedTexts([text])
  return results[0]
}
