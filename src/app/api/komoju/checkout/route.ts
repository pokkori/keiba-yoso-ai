import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const PLANS: Record<string, { amount: number; description: string; cookieValue: string }> = {
  basic: { amount: 980, description: '競馬予想AI ベーシックプラン（月額）', cookieValue: '1' },
  pro: { amount: 2980, description: '競馬予想AI プロプラン（月額）', cookieValue: 'pro' },
  annual: { amount: 19800, description: '競馬予想AI 年間プラン（一括）', cookieValue: 'pro' },
  bundle: { amount: 6980, description: '3競技セットプラン（競馬+競輪+ボートレース）月額', cookieValue: 'pro' },
}

export async function POST(req: Request) {
  try {
    const { planId } = await req.json()

    const plan = PLANS[planId ?? 'basic']
    if (!plan) return NextResponse.json({ error: 'Invalid plan' }, { status: 400 })

    const secretKey = process.env.KOMOJU_SECRET_KEY?.trim()
    if (!secretKey) return NextResponse.json({ error: 'Payment not configured' }, { status: 500 })

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://keiba-yoso-ai.vercel.app'

    const response = await fetch('https://komoju.com/api/v1/sessions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Basic ' + Buffer.from(secretKey + ':').toString('base64'),
      },
      body: JSON.stringify({
        amount: plan.amount,
        currency: 'JPY',
        default_locale: 'ja',
        payment_types: ['credit_card'],
        metadata: { planId: planId ?? 'basic' },
        return_url: `${baseUrl}/success${planId === 'bundle' ? '?plan=bundle' : ''}`,
        cancel_url: `${baseUrl}/`,
      }),
    })

    if (!response.ok) {
      const err = await response.text()
      console.error('Komoju session error:', err)
      return NextResponse.json({ error: err }, { status: 500 })
    }

    const session = await response.json()
    return NextResponse.json({ url: session.session_url, sessionId: session.id })
  } catch (e) {
    console.error('Komoju checkout error:', e)
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
