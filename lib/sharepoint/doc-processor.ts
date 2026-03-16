import mammoth from 'mammoth'

export interface ProcessedDocument {
  text: string
  fileName: string
  fileType: string
}

export async function extractText(
  buffer: Buffer,
  fileName: string
): Promise<ProcessedDocument | null> {
  const ext = fileName.split('.').pop()?.toLowerCase()
  try {
    if (ext === 'docx') {
      const result = await mammoth.extractRawText({ buffer })
      return { text: result.value, fileName, fileType: 'docx' }
    }
    if (ext === 'pdf') {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const pdfParse = require('pdf-parse')
      const result = await pdfParse(buffer)
      return { text: result.text, fileName, fileType: 'pdf' }
    }
    if (ext === 'txt' || ext === 'md') {
      return { text: buffer.toString('utf-8'), fileName, fileType: ext }
    }
    return null
  } catch (err) {
    console.error(`Failed to extract text from ${fileName}:`, err)
    return null
  }
}

export function getFolderTag(filePath: string): string {
  const parts = filePath.split('/')
  const contentIndex = parts.findIndex(
    p => p.toLowerCase() === 'nexusai-content'
  )
  if (contentIndex !== -1 && parts[contentIndex + 1]) {
    return parts[contentIndex + 1].toLowerCase().replace(/[^a-z0-9]/g, '-')
  }
  return 'general'
}
