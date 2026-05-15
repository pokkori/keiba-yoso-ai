import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { signValue } from '@/lib/secure-cookie'

export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  try {
    const { sessionId } = await req.json()

    if (!sessionId) return NextResponse.json({ error: 'No sessionId' }, { status: 400 })

    const secretKey = process.env.KOMOJU_SECRET_KEY?.trim()
    if (!secretKey) return NextResponse.json({ error: 'Not configured' }, { status: 500 })

    const response = await fetch(`https://komoju.com/api/v1/sessions/${sessionId}`, {
      headers: {
        'Authorization': 'Basic ' + Buffer.from(secretKey + ':').toString('base64'),
      },
    })

    if (!response.ok) return NextResponse.json({ verified: false }, { status: 400 })

    const session = await response.json()

    if (session.status === 'completed') {
      const cookieStore = await cookies()
      const planId = session.metadata?.planId || 'basic'
      const cookieValue = (planId === 'pro' || planId === 'annual' || planId === 'bundle') ? 'pro' : '1'

      cookieStore.set('premium', signValue(cookieValue), {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 32,
        path: '/',
      })
      cookieStore.set('komoju_session_id', sessionId, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 32,
        path: '/',
      })
      return NextResponse.json({ verified: true, planId })
    }

    return NextResponse.json({ verified: false })
  } catch (e) {
    console.error('Komoju verify error:', e)
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

export async function GET(req: Request) {
  const url = new URL(req.url)
  const sessionId = url.searchParams.get('session_id')

  if (!sessionId) return NextResponse.json({ verified: false })

  const secretKey = process.env.KOMOJU_SECRET_KEY?.trim()
  if (!secretKey) return NextResponse.json({ verified: false })

  try {
    const response = await fetch(`https://komoju.com/api/v1/sessions/${sessionId}`, {
      headers: {
        'Authorization': 'Basic ' + Buffer.from(secretKey + ':').toString('base64'),
      },
    })

    if (!response.ok) return NextResponse.json({ verified: false })

    const session = await response.json()

    if (session.status === 'completed') {
      const cookieStore = await cookies()
      const planId = session.metadata?.planId || 'basic'
      const cookieValue = (planId === 'pro' || planId === 'annual' || planId === 'bundle') ? 'pro' : '1'

      cookieStore.set('premium', signValue(cookieValue), {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 32,
        path: '/',
      })
      cookieStore.set('komoju_session_id', sessionId, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 32,
        path: '/',
      })
      return NextResponse.json({ verified: true, planId })
    }

    return NextResponse.json({ verified: false })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
