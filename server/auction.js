import { Spam, TopSlot, User } from './models.js'
import { TOP10_MIN_BID_CENTS } from './pricing.js'

// Asegura el ref de populate('ownerId')
User()

export async function ensureTopSlots() {
  const count = await TopSlot().countDocuments()
  if (count >= 10) return
  for (let rank = 1; rank <= 10; rank++) {
    await TopSlot().updateOne(
      { rank },
      { $setOnInsert: { rank, bidCents: 0, spamId: null, bidderId: null } },
      { upsert: true }
    )
  }
}

export async function getTop10() {
  await ensureTopSlots()
  const slots = await TopSlot().find().sort({ rank: 1 }).lean()
  const spamIds = slots.map((s) => s.spamId).filter(Boolean)
  const spams = await Spam()
    .find({ _id: { $in: spamIds } })
    .populate('ownerId', 'name avatar verifiedUntil verifiedMerit')
    .lean()
  const byId = Object.fromEntries(spams.map((s) => [String(s._id), s]))

  return slots.map((slot) => ({
    rank: slot.rank,
    bidCents: slot.bidCents,
    since: slot.since,
    spam: slot.spamId ? serializeSpam(byId[String(slot.spamId)]) : null,
  }))
}

function serializeSpam(spam) {
  if (!spam) return null
  const owner = spam.ownerId
  const verified =
    owner?.verifiedMerit ||
    (owner?.verifiedUntil && new Date(owner.verifiedUntil) > new Date())
  return {
    id: String(spam._id),
    title: spam.title,
    description: spam.description,
    links: spam.links || [],
    country: spam.country,
    socials: spam.socials || {},
    imageUrl: spam.imageUrl,
    category: spam.category,
    priceCents: spam.priceCents ?? null,
    isFree: !!spam.isFree,
    cardLayout: spam.cardLayout === 'image' ? 'image' : 'text',
    zone: spam.zone,
    expiresAt: spam.expiresAt,
    pinUntil: spam.pinUntil,
    bidCents: spam.bidCents || 0,
    createdAt: spam.createdAt,
    owner: owner
      ? {
          id: String(owner._id || owner),
          name: owner.name,
          avatar: owner.avatar,
          verified: !!verified,
        }
      : null,
  }
}

/**
 * Inserta spam en ranking Top10 según puja.
 * Misma puja → debajo (FIFO: el primero conserva prioridad).
 * Puja mayor → sube por encima de los de menor puja.
 */
export async function placeTop10Bid(spam, bidderId, bidCents) {
  if (bidCents < TOP10_MIN_BID_CENTS) {
    throw new Error(`Puja mínima: ${TOP10_MIN_BID_CENTS} céntimo`)
  }

  await ensureTopSlots()
  const slots = await TopSlot().find().sort({ rank: 1 })

  // Quitar spam anterior del mismo bidder si re-puja
  for (const slot of slots) {
    if (slot.spamId && String(slot.spamId) === String(spam._id)) {
      slot.spamId = null
      slot.bidderId = null
      slot.bidCents = 0
      slot.since = null
    }
  }

  const occupied = slots
    .filter((s) => s.spamId)
    .map((s) => ({
      spamId: s.spamId,
      bidderId: s.bidderId,
      bidCents: s.bidCents,
      since: s.since || s.createdAt || new Date(),
    }))

  const entry = {
    spamId: spam._id,
    bidderId,
    bidCents,
    since: new Date(),
  }

  occupied.push(entry)

  // Orden: bid DESC, since ASC (primero en llegar gana empate)
  occupied.sort((a, b) => {
    if (b.bidCents !== a.bidCents) return b.bidCents - a.bidCents
    return new Date(a.since) - new Date(b.since)
  })

  const top = occupied.slice(0, 10)
  const dropped = occupied.slice(10)

  for (let i = 0; i < 10; i++) {
    const slot = slots.find((s) => s.rank === i + 1) || slots[i]
    const item = top[i]
    if (item) {
      slot.spamId = item.spamId
      slot.bidderId = item.bidderId
      slot.bidCents = item.bidCents
      slot.since = item.since
    } else {
      slot.spamId = null
      slot.bidderId = null
      slot.bidCents = 0
      slot.since = null
    }
    await slot.save()
  }

  spam.zone = 'top10'
  spam.bidCents = bidCents
  // Top10 eterno: expires lejos (100 años) — sale solo por subasta
  spam.expiresAt = new Date('2099-01-01T00:00:00.000Z')
  await spam.save()

  // Los dropeados vuelven a featured si aún existían
  for (const d of dropped) {
    await Spam().updateOne(
      { _id: d.spamId, zone: 'top10' },
      {
        $set: {
          zone: 'featured',
          expiresAt: new Date(Date.now() + 60 * 60 * 1000),
        },
      }
    )
  }

  return getTop10()
}

export { serializeSpam }
