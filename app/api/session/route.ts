import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db/postgres'
import { randomBytes } from 'crypto'

export async function POST(req: NextRequest) {
  try {
    const { sessionToken, email, company, role } = await req.json()

    const token = sessionToken || randomBytes(16).toString('hex')

    await query(
      `INSERT INTO sessions (session_token, email, company, role)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (session_token)
       DO UPDATE SET
         email = COALESCE(EXCLUDED.email, sessions.email),
         company = COALESCE(EXCLUDED.company, sessions.company),
         role = COALESCE(EXCLUDED.role, sessions.role),
         last_active_at = NOW()`,
      [token, email ?? null, company ?? null, role ?? null]
    )

    return NextResponse.json({ sessionToken: token })
  } catch (err) {
    console.error('Session error:', err)
    return NextResponse.json(
      { error: 'Session failed' },
      { status: 500 }
    )
  }
}
