import { listChangedFiles, downloadFileContent } from './graph-client'
import { extractText, getFolderTag } from './doc-processor'
import { chunkText } from './chunker'
import { query } from '../db/postgres'
import { embedTexts } from '../embeddings/voyage'

const SUPPORTED_EXTENSIONS = ['docx', 'pdf', 'txt', 'md']

function isSupported(fileName: string): boolean {
  const ext = fileName.split('.').pop()?.toLowerCase() ?? ''
  return SUPPORTED_EXTENSIONS.includes(ext)
}

export async function runDeltaSync(): Promise<{
  filesProcessed: number
  chunksUpserted: number
  newDeltaLink: string
}> {
  const syncRecord = await query(
    `INSERT INTO sync_log (status) VALUES ('running') RETURNING id`
  )
  const syncId = syncRecord.rows[0].id

  let filesProcessed = 0
  let chunksUpserted = 0

  try {
    const lastSync = await query(
      `SELECT delta_link FROM sync_log
       WHERE status = 'success'
       ORDER BY completed_at DESC LIMIT 1`
    )
    const deltaLink = lastSync.rows[0]?.delta_link

    let response = await listChangedFiles(deltaLink)
    let allItems = [...(response.value ?? [])]

    while (response['@odata.nextLink']) {
      response = await listChangedFiles(response['@odata.nextLink'])
      allItems = [...allItems, ...(response.value ?? [])]
    }

    const newDeltaLink = response['@odata.deltaLink'] ?? ''

    for (const item of allItems) {
      if (item.deleted) {
        await query(
          `DELETE FROM document_chunks WHERE source_url = $1`,
          [item.webUrl ?? '']
        )
        continue
      }

      if (!item.file || !isSupported(item.name)) continue

      try {
        const buffer = await downloadFileContent(
          item.parentReference?.driveId,
          item.id
        )

        const processed = await extractText(buffer, item.name)
        if (!processed || !processed.text.trim()) continue

        const useCase = getFolderTag(
          item.parentReference?.path ?? item.name
        )

        await query(
          `DELETE FROM document_chunks WHERE source_file_name = $1`,
          [item.name]
        )

        const chunks = chunkText(processed.text)
        const texts = chunks.map(c => c.content)
        const embeddings = await embedTexts(texts)

        for (let i = 0; i < chunks.length; i++) {
          await query(
            `INSERT INTO document_chunks
             (content, embedding, source_file_name, source_url,
              section_heading, chunk_index, use_case_tag, modified_at)
             VALUES ($1, $2::vector, $3, $4, $5, $6, $7, $8)`,
            [
              chunks[i].content,
              `[${embeddings[i].join(',')}]`,
              item.name,
              item.webUrl ?? '',
              chunks[i].sectionHeading ?? '',
              chunks[i].chunkIndex,
              useCase,
              item.lastModifiedDateTime ?? new Date().toISOString(),
            ]
          )
          chunksUpserted++
        }

        filesProcessed++
        console.log(`Processed: ${item.name} → ${chunks.length} chunks`)
      } catch (err) {
        console.error(`Error processing ${item.name}:`, err)
      }
    }

    await query(
      `UPDATE sync_log
       SET status='success', completed_at=NOW(),
           files_processed=$1, chunks_upserted=$2, delta_link=$3
       WHERE id=$4`,
      [filesProcessed, chunksUpserted, newDeltaLink, syncId]
    )

    return { filesProcessed, chunksUpserted, newDeltaLink }
  } catch (err) {
    await query(
      `UPDATE sync_log
       SET status='failed', completed_at=NOW(), error_message=$1
       WHERE id=$2`,
      [String(err), syncId]
    )
    throw err
  }
}
