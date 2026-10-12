import { RateBucket } from './models.js'
import { FREE_RATE_LIMIT, VIP_RATE_LIMIT } from './pricing.js'

export async function checkRateLimit(user) {
  const vip = user.isVip()
  const conf = vip ? VIP_RATE_LIMIT : FREE_RATE_LIMIT
  const key = `post:${user._id}`
  const now = Date.now()

  let bucket = await RateBucket().findOne({ key })
  if (!bucket) {
    bucket = await RateBucket().create({
      key,
      count: 1,
      windowStart: new Date(now),
    })
    return { ok: true, remaining: conf.max - 1, vip }
  }

  const elapsed = now - new Date(bucket.windowStart).getTime()
  if (elapsed > conf.windowMs) {
    bucket.count = 1
    bucket.windowStart = new Date(now)
    await bucket.save()
    return { ok: true, remaining: conf.max - 1, vip }
  }

  if (bucket.count >= conf.max) {
    return {
      ok: false,
      remaining: 0,
      vip,
      retryMs: conf.windowMs - elapsed,
      error: vip
        ? 'Límite VIP alcanzado, espera un momento'
        : 'Límite free alcanzado. Compra VIP ilimitado o espera.',
    }
  }

  bucket.count += 1
  await bucket.save()
  return { ok: true, remaining: conf.max - bucket.count, vip }
}
