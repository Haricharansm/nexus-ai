import { NextRequest } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { embedQuery } from '@/lib/embeddings/voyage'
import { searchSimilarDocuments } from '@/lib/db/postgres'
import { query } from '@/lib/db/postgres'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

const SYSTEM_PROMPT = `You are an expert AI advisor for Saxon Infosystems, a Data & AI consulting firm.
You help executives across Supply Chain, Taxation, Costing, MIS & Budgeting, Factory, and HR departments
understand implemented AI use cases, capabilities, and implementation approaches.

When answering, use the retrieved context below to ground your response in Saxon's actual
project experience. Always be specific with metrics and outcomes. Keep responses concise
(3-5 sentences) and always end with a clear next step or offer.

If the context does not contain relevant information, answer from general knowledge but
make clear you are doing so.`

export async function POST(req: NextRequest) {
  try {
    const { message, history = [], sessionId } = await req.json()

    if (!message) {
      return new Response(JSON.stringify({ error: 'Message required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Embed the query and retrieve relevant chunks
    const queryEmbedding = await embedQuery(message)
    const chunks = await searchSimilarDocuments(queryEmbedding, 5)

    // Build context from retrieved chunks
    const context = chunks.length > 0
      ? chunks
          .map((c, i) => `[${i + 1}] ${c.source_file_name}: ${c.content}`)
          .join('\n\n')
      : 'No specific documents found for this query.'

    const systemWithContext = `${SYSTEM_PROMPT}

RETRIEVED CONTEXT FROM SAXON INFOSYSTEMS DOCUMENTS:
${context}`

    // Build message history
    const messages: Anthropic.MessageParam[] = [
      ...history,
      { role: 'user', content: message },
    ]

    // Save session turn
    if (sessionId) {
      await query(
        `UPDATE sessions
         SET messages_json = messages_json || $1::jsonb,
             last_active_at = NOW()
         WHERE session_token = $2`,
        [
          JSON.stringify([
            { role: 'user', content: message, timestamp: new Date().toISOString() },
          ]),
          sessionId,
        ]
      ).catch(() => {})
    }

    // Stream Claude response
    const encoder = new TextEncoder()
    const stream = new ReadableStream({
      async start(controller) {
        try {
          const response = await anthropic.messages.stream({
            model: 'claude-sonnet-4-6',
            max_tokens: 1024,
            system: systemWithContext,
            messages,
          })

          let fullResponse = ''

          for await (const chunk of response) {
            if (
              chunk.type === 'content_block_delta' &&
              chunk.delta.type === 'text_delta'
            ) {
              const text = chunk.delta.text
              fullResponse += text
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text })}\n\n`))
            }
          }

          // Save assistant response to session
          if (sessionId && fullResponse) {
            await query(
              `UPDATE sessions
               SET messages_json = messages_json || $1::jsonb
               WHERE session_token = $2`,
              [
                JSON.stringify([
                  { role: 'assistant', content: fullResponse, timestamp: new Date().toISOString() },
                ]),
                sessionId,
              ]
            ).catch(() => {})
          }

          controller.enqueue(encoder.encode('data: [DONE]\n\n'))
          controller.close()
        } catch (err) {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ error: String(err) })}\n\n`)
          )
          controller.close()
        }
      },
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}
