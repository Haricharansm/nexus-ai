import { NextResponse } from 'next/server'
import { query } from '@/lib/db/postgres'

export async function GET() {
  try {
    const result = await query(
      `SELECT * FROM use_cases ORDER BY domain, title`
    )
    return NextResponse.json(result.rows)
  } catch (err) {
    console.error('Failed to fetch use cases:', err)
    return NextResponse.json(
      { error: 'Failed to fetch use cases' },
      { status: 500 }
    )
  }
}
