import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { query } from '@/lib/db/postgres'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

export async function POST(req: NextRequest) {
  try {
    const {
      company, contactRole, documentType, useCaseFocus,
      businessContext, timeline, budgetRange, sessionId,
    } = await req.json()

    const prompt = `Generate a professional ${documentType} for pharma/enterprise company "${company || 'the client'}", addressed to their ${contactRole || 'leadership team'}.

Use Case Focus: ${useCaseFocus}
Business Context: ${businessContext || 'Modernising operations with Data & AI to improve efficiency and reduce costs.'}
Timeline: ${timeline}
Budget Range: ${budgetRange}

Create a structured document with these exact sections:
1. EXECUTIVE SUMMARY (2-3 sentences on business value)
2. OBJECTIVES & SUCCESS METRICS (4 specific KPIs with measurable targets)
3. SCOPE OF WORK (3-4 key workstreams with sub-activities)
4. PROPOSED APPROACH & METHODOLOGY
5. IMPLEMENTATION TIMELINE (phase names with week ranges)
6. DELIVERABLES (5-6 concrete items)
7. INVESTMENT OVERVIEW (structure reference, no exact figures)
8. WHY SAXON INFOSYSTEMS (2 sentences referencing AI & Data track record)

Write in professional consulting style. Be specific and substantive.`

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1500,
      messages: [{ role: 'user', content: prompt }],
    })

    const content = response.content[0].type === 'text'
      ? response.content[0].text
      : ''

    // Save to database
    const saved = await query(
      `INSERT INTO sows
       (session_id, company, contact_role, document_type, use_case_focus,
        business_context, timeline, budget_range, generated_content)
       VALUES (
         (SELECT id FROM sessions WHERE session_token=$1 LIMIT 1),
         $2,$3,$4,$5,$6,$7,$8,$9
       ) RETURNING id`,
      [
        sessionId ?? '', company ?? '', contactRole ?? '',
        documentType ?? '', useCaseFocus ?? '',
        businessContext ?? '', timeline ?? '', budgetRange ?? '',
        content,
      ]
    ).catch(() => ({ rows: [{ id: null }] }))

    return NextResponse.json({
      success: true,
      content,
      sowId: saved.rows[0]?.id,
    })
  } catch (err) {
    console.error('SOW generation failed:', err)
    return NextResponse.json(
      { error: 'Generation failed', detail: String(err) },
      { status: 500 }
    )
  }
}
