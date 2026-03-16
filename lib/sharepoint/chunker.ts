export interface TextChunk {
  content: string
  chunkIndex: number
  sectionHeading?: string
}

const CHUNK_SIZE = 500
const CHUNK_OVERLAP = 50

function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4)
}

function splitIntoWords(text: string): string[] {
  return text.split(/\s+/).filter(w => w.length > 0)
}

function extractHeading(text: string): string | undefined {
  const lines = text.split('\n')
  for (const line of lines) {
    const trimmed = line.trim()
    if (trimmed.length > 0 && trimmed.length < 100) {
      return trimmed
    }
  }
  return undefined
}

export function chunkText(text: string): TextChunk[] {
  const words = splitIntoWords(text)
  const chunks: TextChunk[] = []
  let chunkIndex = 0
  let startIdx = 0

  while (startIdx < words.length) {
    let endIdx = startIdx
    let tokenCount = 0

    while (endIdx < words.length && tokenCount < CHUNK_SIZE) {
      tokenCount += estimateTokens(words[endIdx] + ' ')
      endIdx++
    }

    const chunkWords = words.slice(startIdx, endIdx)
    const content = chunkWords.join(' ').trim()

    if (content.length > 50) {
      chunks.push({
        content,
        chunkIndex,
        sectionHeading: extractHeading(content),
      })
      chunkIndex++
    }

    startIdx = Math.max(startIdx + 1, endIdx - CHUNK_OVERLAP)
  }

  return chunks
}
