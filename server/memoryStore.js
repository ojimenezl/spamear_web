/**
 * Fallback in-memory store when MONGODB_URI is not configured.
 * Enough for local UI/API demos.
 */
import { randomUUID } from 'crypto'

const db = {
  users: [],
  spams: [],
  topSlots: Array.from({ length: 10 }, (_, i) => ({
    rank: i + 1,
    spamId: null,
    bidderId: null,
    bidCents: 0,
    since: null,
  })),
  banners: [
    'strip-top',
    'left-1',
    'left-2',
    'left-3',
    'circle-a',
    'circle-b',
    'circle-c',
    'circle-d',
    'foot-1',
    'foot-2',
    'foot-3',
    'foot-4',
  ].map((slotKey) => ({
    slotKey,
    imageUrl: null,
    linkUrl: null,
    title: null,
    description: null,
    category: null,
    country: null,
    priceCents: null,
    isFree: false,
    socials: {},
    links: [],
    ownerId: null,
    expiresAt: null,
  })),
  ledger: [],
  rate: new Map(),
}

function now() {
  return new Date()
}

function purgeExpired() {
  const t = now()
  db.spams = db.spams.filter((s) => new Date(s.expiresAt) > t)
  for (const b of db.banners) {
    if (b.expiresAt && new Date(b.expiresAt) <= t) {
      b.imageUrl = null
      b.linkUrl = null
      b.title = null
      b.description = null
      b.category = null
      b.country = null
      b.priceCents = null
      b.isFree = false
      b.socials = {}
      b.links = []
      b.ownerId = null
      b.expiresAt = null
    }
  }
}

export const memory = {
  enabled: true,
  async findUserByEmail(email) {
    return db.users.find((u) => u.email === email) || null
  },
  async findUserById(id) {
    return db.users.find((u) => u._id === id) || null
  },
  async createUser(data) {
    const user = {
      _id: randomUUID(),
      creditsCents: 0,
      vipUntil: null,
      verifiedUntil: null,
      verifiedMerit: false,
      spamCount: 0,
      activeDays: [],
      ...data,
      createdAt: now(),
    }
    user.isVip = () => user.vipUntil && new Date(user.vipUntil) > now()
    user.isVerified = () =>
      user.verifiedMerit ||
      (user.verifiedUntil && new Date(user.verifiedUntil) > now())
    user.touchActiveDay = () => {
      const day = now().toISOString().slice(0, 10)
      if (!user.activeDays.includes(day)) user.activeDays.push(day)
    }
    user.checkMeritVerified = () => {
      if (user.spamCount < 1000) return false
      const cutoff = new Date()
      cutoff.setDate(cutoff.getDate() - 90)
      const recent = user.activeDays.filter((d) => new Date(d) >= cutoff)
      if (recent.length >= 90) {
        user.verifiedMerit = true
        return true
      }
      return false
    }
    user.save = async () => user
    db.users.push(user)
    return user
  },
  async saveUser(user) {
    return user
  },
  async listSpams({ zone, q, category, minPrice, maxPrice }) {
    purgeExpired()
    let list = db.spams.filter((s) => new Date(s.expiresAt) > now())
    if (zone) list = list.filter((s) => s.zone === zone)
    if (category) list = list.filter((s) => s.category === category)
    if (q) {
      const t = q.toLowerCase()
      list = list.filter(
        (s) =>
          s.title.toLowerCase().includes(t) ||
          s.description.toLowerCase().includes(t) ||
          s.category.toLowerCase().includes(t)
      )
    }
    if (minPrice != null) list = list.filter((s) => (s.priceCents ?? 0) >= minPrice)
    if (maxPrice != null) list = list.filter((s) => (s.priceCents ?? Infinity) <= maxPrice)

    list.sort((a, b) => {
      const ap = a.pinUntil && new Date(a.pinUntil) > now() ? 1 : 0
      const bp = b.pinUntil && new Date(b.pinUntil) > now() ? 1 : 0
      if (bp !== ap) return bp - ap
      return new Date(b.expiresAt) - new Date(a.expiresAt) || new Date(b.createdAt) - new Date(a.createdAt)
    })
    return list
  },
  async createSpam(data) {
    const spam = {
      _id: randomUUID(),
      ...data,
      createdAt: now(),
      updatedAt: now(),
    }
    db.spams.unshift(spam)
    return spam
  },
  async findSpam(id) {
    return db.spams.find((s) => s._id === id) || null
  },
  async updateSpam(id, patch) {
    const s = await this.findSpam(id)
    if (!s) return null
    Object.assign(s, patch, { updatedAt: now() })
    return s
  },
  getTopSlots() {
    return db.topSlots.map((s) => ({ ...s }))
  },
  setTopSlots(slots) {
    db.topSlots = slots
  },
  getBanners() {
    purgeExpired()
    return db.banners.map((b) => ({ ...b }))
  },
  setBanner(slotKey, data) {
    const b = db.banners.find((x) => x.slotKey === slotKey)
    if (!b) return null
    Object.assign(b, data)
    return b
  },
  async charge(user, amount, type, meta) {
    if (amount === 0) return user
    if (user.creditsCents < amount) {
      const err = new Error('Crédito insuficiente. Recarga tu monedero.')
      err.code = 'INSUFFICIENT_CREDITS'
      throw err
    }
    user.creditsCents -= amount
    const vipBoost = new Date(Date.now() + 24 * 60 * 60 * 1000)
    if (!user.vipUntil || new Date(user.vipUntil) < vipBoost) user.vipUntil = vipBoost
    db.ledger.push({
      userId: user._id,
      type,
      amountCents: -amount,
      balanceAfter: user.creditsCents,
      meta,
      createdAt: now(),
    })
    return user
  },
  async credit(user, amount, type, meta, stripeSessionId) {
    user.creditsCents += amount
    db.ledger.push({
      userId: user._id,
      type,
      amountCents: amount,
      balanceAfter: user.creditsCents,
      meta,
      stripeSessionId,
      createdAt: now(),
    })
    return user
  },
  checkRate(user, vip) {
    const max = vip ? 60 : 3
    const windowMs = 60_000
    const key = String(user._id)
    const entry = db.rate.get(key) || { count: 0, start: Date.now() }
    if (Date.now() - entry.start > windowMs) {
      entry.count = 0
      entry.start = Date.now()
    }
    if (entry.count >= max) {
      return { ok: false, error: vip ? 'Límite VIP' : 'Límite free. Compra VIP.', vip }
    }
    entry.count++
    db.rate.set(key, entry)
    return { ok: true, vip, remaining: max - entry.count }
  },
  cleanup() {
    purgeExpired()
    return { ok: true }
  },
}
