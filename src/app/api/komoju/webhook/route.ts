import { NextResponse } from 'next/server'
import crypto from 'crypto'

export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  try {
    const body = await req.text()
    const signature = req.headers.get('x-komoju-signature')
    const webhookSecret = process.env.KOMOJU_WEBHOOK_SECRET

    if (webhookSecret && signature) {
      const expected = crypto.createHmac('sha256', webhookSecret).update(body).digest('hex')
      if (expected !== signature) {
        console.error('Komoju webhook: invalid signature')
        return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
      }
    }

    const event = JSON.parse(body)
    console.log('Komoju webhook received:', event.type, event.data?.object?.id)

    switch (event.type) {
      case 'payment.captured':
        console.log('Payment captured:', event.data?.object?.id)
        break
      case 'payment.failed':
        console.log('Payment failed:', event.data?.object?.id)
        break
      default:
        console.log('Unhandled event type:', event.type)
    }

    return NextResponse.json({ received: true })
  } catch (e) {
    console.error('Komoju webhook error:', e)
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
