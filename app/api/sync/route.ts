import { NextRequest, NextResponse } from 'next/server'
import { runDeltaSync } from '@/lib/sharepoint/delta-sync'

export async function POST(req: NextRequest) {
  const secret = req.headers.get('x-cron-secret')
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  }

  try {
    console.log('Starting SharePoint sync...')
    const result = await runDeltaSync()
    console.log('Sync complete:', result)
    return NextResponse.json({ success: true, ...result })
  } catch (err) {
    console.error('Sync failed:', err)
    return NextResponse.json(
      { error: 'Sync failed', detail: String(err) },
      { status: 500 }
    )
  }
}
