import { createHmac, timingSafeEqual } from "crypto"

const SECRET = process.env.COOKIE_SECRET

export function signValue(value: string): string {
  if (!SECRET) return value  // 未設定時はそのまま返す（後方互換）
  const sig = createHmac("sha256", SECRET).update(value).digest("base64url")
  return `${value}.${sig}`
}

export function verifyValue(signed: string): string | null {
  if (!SECRET) {
    // COOKIE_SECRET未設定時は旧形式（署名なし）をそのまま受け入れ
    return signed || null
  }
  const lastDot = signed.lastIndexOf(".")
  if (lastDot === -1) {
    // 旧形式Cookie（署名なし）を後方互換で受け入れ
    return signed || null
  }
  const value = signed.slice(0, lastDot)
  const sig = signed.slice(lastDot + 1)
  const expected = createHmac("sha256", SECRET).update(value).digest("base64url")
  try {
    const a = Buffer.from(sig)
    const b = Buffer.from(expected)
    if (a.length !== b.length) return null
    if (!timingSafeEqual(a, b)) return null
    return value
  } catch {
    return null
  }
}
