import express from 'express'
import cors from 'cors'
import jwt from 'jsonwebtoken'
import { connectDb } from './db.js'
import {
  User,
  Spam,
  TopSlot,
  BannerSlot,
  Ledger,
} from './models.js'

// Registra modelos para populate / refs
User()
Spam()
TopSlot()
BannerSlot()
Ledger()
import {
  loginWithGoogleIdToken,
  publicUser,
  requireUser,
  getUserFromRequest,
  signToken,
} from './auth.js'
import { searchCategories, CATEGORIES } from './categories.js'
import {
  DURATIONS,
  PINS,
  BANNER_DURATIONS,
  WALLET_PACKS,
  UNLIMITED_PACK,
  VERIFIED_YEARLY,
  TOP10_MIN_BID_CENTS,
  getWalletMinCents,
  getCheapestPaidAdCents,
  makeWalletAmount,
  getDuration,
  getPin,
  getBannerDuration,
  getWalletPack,
} from './pricing.js'
import { checkRateLimit } from './rateLimit.js'
import { chargeCredits, addCredits } from './credits.js'
import { getTop10, placeTop10Bid, serializeSpam, ensureTopSlots } from './auction.js'
import {
  createWalletCheckout,
  createProductCheckout,
  retrieveCheckoutSession,
  constructWebhookEvent,
  isStripeTestUser,
} from './stripeService.js'
import { memory } from './memoryStore.js'
import { postWallSnapshot } from './twitter.js'
import { BANNER_SLOTS, BANNER_SLOT_KEYS } from './bannerSlots.js'

let useMemory = false

async function initStore() {
  try {
    const conn = await connectDb()
    if (!conn) {
      useMemory = true
      console.log('[spamear] Running with in-memory store (set MONGODB_URI for Atlas)')
    } else {
      useMemory = false
      await ensureTopSlots()
      for (const slotKey of BANNER_SLOT_KEYS) {
        await BannerSlot().updateOne(
          { slotKey },
          { $setOnInsert: { slotKey } },
          { upsert: true }
        )
      }
      console.log('[spamear] Connected to MongoDB')
    }
  } catch (e) {
    useMemory = true
    console.warn('[spamear] Mongo failed, memory store:', e.message)
  }
}

function hydrateMemoryUser(user) {
  if (!user) return null
  user.isVip = () => user.vipUntil && new Date(user.vipUntil) > new Date()
  user.isVerified = () =>
    user.verifiedMerit ||
    (user.verifiedUntil && new Date(user.verifiedUntil) > new Date())
  user.touchActiveDay = () => {
    const day = new Date().toISOString().slice(0, 10)
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
  return user
}

async function memLogin(email, name = 'Usuario') {
  let user = hydrateMemoryUser(await memory.findUserByEmail(email))
  if (!user) {
    user = await memory.createUser({
      googleId: 'mem-' + email,
      email,
      name,
      avatar: '',
      creditsCents: 0,
    })
  } else {
    user.touchActiveDay()
  }
  return { user, token: signToken({ _id: user._id, email: user.email }) }
}

async function memRequireUser(req, res) {
  const header = req.headers.authorization || ''
  if (!header.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Inicia sesión con Google' })
    return null
  }
  try {
    const secret = process.env.JWT_SECRET || 'dev-secret-change-me'
    const payload = jwt.verify(header.slice(7), secret)
    const user = hydrateMemoryUser(await memory.findUserById(payload.sub))
    if (!user) {
      res.status(401).json({ error: 'Usuario no encontrado' })
      return null
    }
    user.touchActiveDay()
    return user
  } catch {
    res.status(401).json({ error: 'Sesión inválida' })
    return null
  }
}

function mapOwner(owner) {
  if (!owner) return null
  const verified =
    owner.verifiedMerit ||
    (owner.verifiedUntil && new Date(owner.verifiedUntil) > new Date())
  return {
    id: String(owner._id),
    name: owner.name,
    avatar: owner.avatar,
    verified: !!verified,
  }
}

function mapSpam(spam, owner) {
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
    owner: mapOwner(owner),
  }
}

function mapBannerPublic(b) {
  const live = b.expiresAt && new Date(b.expiresAt) > new Date() && b.imageUrl
  if (!live) {
    return {
      slotKey: b.slotKey,
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
      expiresAt: b.expiresAt || null,
    }
  }
  const links = Array.isArray(b.links) ? b.links.filter(Boolean) : []
  const linkUrl = b.linkUrl || links[0] || ''
  return {
    slotKey: b.slotKey,
    imageUrl: b.imageUrl,
    linkUrl: linkUrl || null,
    title: b.title || null,
    description: b.description || null,
    category: b.category || null,
    country: b.country || null,
    priceCents: b.priceCents ?? null,
    isFree: !!b.isFree,
    socials: b.socials || {},
    links: links.length ? links : linkUrl ? [linkUrl] : [],
    expiresAt: b.expiresAt,
  }
}

export async function createApp() {
  await initStore()
  const app = express()
  app.use(cors({ origin: true, credentials: true }))

  app.post(
    '/api/stripe/webhook',
    express.raw({ type: 'application/json' }),
    async (req, res) => {
      const sig = req.headers['stripe-signature']
      let event
      try {
        ;({ event } = constructWebhookEvent(req.body, sig))
      } catch (err) {
        return res.status(400).send(`Webhook Error: ${err.message}`)
      }

      if (event.type === 'checkout.session.completed') {
        await handleCheckoutCompleted(event.data.object)
      }
      res.json({ received: true })
    }
  )

  app.use(express.json({ limit: '1mb' }))

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true, store: useMemory ? 'memory' : 'mongo' })
  })

  app.get('/api/config', (_req, res) => {
    res.json({
      googleClientId:
        process.env.VITE_GOOGLE_CLIENT_ID ||
        process.env.GOOGLE_CLIENT_ID ||
        process.env.GOOGLE_ID_CLIENTE ||
        '',
      stripePublishableKey: process.env.VITE_STRIPE_PUBLISHABLE_KEY || '',
      prices: {
        durations: DURATIONS,
        pins: PINS,
        banners: BANNER_DURATIONS,
        wallet: WALLET_PACKS,
        unlimited: UNLIMITED_PACK,
        verified: VERIFIED_YEARLY,
        top10MinBidCents: TOP10_MIN_BID_CENTS,
        walletMinCents: getWalletMinCents(),
        cheapestPaidAdCents: getCheapestPaidAdCents(),
      },
      categoriesCount: CATEGORIES.length,
      bannerSlots: BANNER_SLOTS,
      store: useMemory ? 'memory' : 'mongo',
    })
  })

  app.get('/api/categories', (req, res) => {
    res.json({ items: searchCategories(req.query.q || '') })
  })

  app.post('/api/auth/google', async (req, res) => {
    try {
      const { idToken } = req.body || {}
      if (!idToken) {
        return res.status(400).json({ error: 'idToken requerido' })
      }
      if (useMemory) {
        const googleClientId =
          process.env.GOOGLE_CLIENT_ID ||
          process.env.VITE_GOOGLE_CLIENT_ID ||
          process.env.GOOGLE_ID_CLIENTE
        if (!googleClientId) {
          return res.status(500).json({ error: 'GOOGLE_CLIENT_ID no configurado' })
        }
        const { OAuth2Client } = await import('google-auth-library')
        const client = new OAuth2Client(googleClientId)
        const ticket = await client.verifyIdToken({
          idToken,
          audience: googleClientId,
        })
        const payload = ticket.getPayload()
        if (!payload?.email) {
          return res.status(401).json({ error: 'Google token inválido' })
        }
        const result = await memLogin(
          payload.email,
          payload.name || payload.email.split('@')[0]
        )
        return res.json({
          token: result.token,
          user: publicUser(result.user),
          stripeTest: isStripeTestUser(result.user),
        })
      }
      const result = await loginWithGoogleIdToken(idToken)
      res.json({
        token: result.token,
        user: publicUser(result.user),
        stripeTest: isStripeTestUser(result.user),
      })
    } catch (e) {
      res.status(401).json({ error: e.message || 'Auth fallida' })
    }
  })

  app.get('/api/me', async (req, res) => {
    const user = useMemory
      ? await memRequireUser(req, res)
      : await getUserFromRequest(req)
    if (!user) {
      if (!res.headersSent) res.status(401).json({ error: 'No auth' })
      return
    }
    res.json({ user: publicUser(user) })
  })

  app.get('/api/feed', async (req, res) => {
    try {
      const q = String(req.query.q || '').trim()
      const category = String(req.query.category || '').trim()
      const minPrice = req.query.minPrice != null ? Number(req.query.minPrice) : null
      const maxPrice = req.query.maxPrice != null ? Number(req.query.maxPrice) : null
      const wallLimit = Math.min(Math.max(Number(req.query.wallLimit) || 12, 1), 48)
      const wallOffset = Math.max(Number(req.query.wallOffset) || 0, 0)

      if (useMemory) {
        const featured = await memory.listSpams({
          zone: 'featured',
          q,
          category,
          minPrice,
          maxPrice,
        })
        const live = await memory.listSpams({
          zone: 'live',
          q,
          category,
          minPrice,
          maxPrice,
        })
        const combined = [...featured, ...live]
        const wallTotal = combined.length
        const page = combined.slice(wallOffset, wallOffset + wallLimit)
        const ownerEntries = await Promise.all(
          page.map(async (s) => [s.ownerId, await memory.findUserById(s.ownerId)])
        )
        const owners = Object.fromEntries(ownerEntries)
        return res.json({
          top10: await memGetTop10(),
          wall: page.map((s) => ({
            ...mapSpam(s, owners[s.ownerId]),
            _zone: s.zone,
          })),
          wallTotal,
          wallOffset,
          wallLimit,
          wallHasMore: wallOffset + page.length < wallTotal,
          banners: memory.getBanners().map(mapBannerPublic),
          featured: [],
          live: [],
        })
      }

      const filter = {
        expiresAt: { $gt: new Date() },
        zone: { $in: ['featured', 'live'] },
      }
      if (category) filter.category = category
      if (minPrice != null || maxPrice != null) {
        filter.priceCents = {}
        if (minPrice != null) filter.priceCents.$gte = minPrice
        if (maxPrice != null) filter.priceCents.$lte = maxPrice
      }
      if (q) {
        const rx = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')
        filter.$or = [
          { title: rx },
          { description: rx },
          { category: rx },
          { country: rx },
        ]
      }

      const [wallTotal, wallDocs, top10, banners] = await Promise.all([
        Spam().countDocuments(filter),
        Spam()
          .find(filter)
          .sort({ pinUntil: -1, createdAt: -1 })
          .skip(wallOffset)
          .limit(wallLimit)
          .populate('ownerId', 'name avatar verifiedUntil verifiedMerit')
          .lean(),
        getTop10(),
        BannerSlot().find().lean(),
      ])

      res.json({
        top10,
        wall: wallDocs.map((s) => ({
          ...serializeSpam(s),
          _zone: s.zone,
        })),
        wallTotal,
        wallOffset,
        wallLimit,
        wallHasMore: wallOffset + wallDocs.length < wallTotal,
        featured: [],
        live: [],
        banners: banners.map(mapBannerPublic),
      })
    } catch (e) {
      res.status(500).json({ error: e.message })
    }
  })

  async function mapSpamMem(spamId) {
    const spam = await memory.findSpam(spamId)
    if (!spam) return null
    const owner = await memory.findUserById(spam.ownerId)
    return mapSpam(spam, owner)
  }

  async function memGetTop10() {
    const slots = memory.getTopSlots()
    const out = []
    for (const slot of slots) {
      out.push({
        rank: slot.rank,
        bidCents: slot.bidCents,
        since: slot.since,
        spam: slot.spamId ? await mapSpamMem(slot.spamId) : null,
      })
    }
    return out
  }

  async function memPlaceTop10(spam, bidderId, bidCents) {
    if (bidCents < TOP10_MIN_BID_CENTS) throw new Error('Puja mínima 1 céntimo')
    let slots = memory.getTopSlots()
    for (const s of slots) {
      if (s.spamId === spam._id) {
        s.spamId = null
        s.bidderId = null
        s.bidCents = 0
        s.since = null
      }
    }
    const occupied = slots
      .filter((s) => s.spamId)
      .map((s) => ({
        spamId: s.spamId,
        bidderId: s.bidderId,
        bidCents: s.bidCents,
        since: s.since || new Date(),
      }))
    occupied.push({
      spamId: spam._id,
      bidderId,
      bidCents,
      since: new Date(),
    })
    occupied.sort((a, b) => {
      if (b.bidCents !== a.bidCents) return b.bidCents - a.bidCents
      return new Date(a.since) - new Date(b.since)
    })
    const top = occupied.slice(0, 10)
    const dropped = occupied.slice(10)
    slots = Array.from({ length: 10 }, (_, i) => {
      const item = top[i]
      return item
        ? {
            rank: i + 1,
            spamId: item.spamId,
            bidderId: item.bidderId,
            bidCents: item.bidCents,
            since: item.since,
          }
        : {
            rank: i + 1,
            spamId: null,
            bidderId: null,
            bidCents: 0,
            since: null,
          }
    })
    memory.setTopSlots(slots)
    await memory.updateSpam(spam._id, {
      zone: 'top10',
      bidCents,
      expiresAt: new Date('2099-01-01T00:00:00.000Z'),
    })
    for (const d of dropped) {
      await memory.updateSpam(d.spamId, {
        zone: 'featured',
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      })
    }
    return memGetTop10()
  }

  app.post('/api/spam', async (req, res) => {
    try {
      const user = useMemory
        ? await memRequireUser(req, res)
        : await requireUser(req, res)
      if (!user) return

      const rate = useMemory
        ? memory.checkRate(user, user.isVip())
        : await checkRateLimit(user)
      if (!rate.ok) return res.status(429).json({ error: rate.error, vip: rate.vip })

      const body = req.body || {}
      const title = String(body.title || '').trim()
      const description = String(body.description || '').trim()
      const category = String(body.category || '').trim()
      const destination = body.destination || 'live' // live | featured | top10
      const durationId = body.durationId || '30m'
      const pinId = body.pinId || null
      const bidCents = Number(body.bidCents || 0)
      const links = Array.isArray(body.links)
        ? body.links.map(String).filter(Boolean).slice(0, 1)
        : body.link
          ? [String(body.link).trim()].filter(Boolean).slice(0, 1)
          : []
      const country = String(body.country || '').trim().slice(0, 80)
      const imageUrl = String(body.imageUrl || '').trim().slice(0, 1000)
      const socials = body.socials || {}
      const isFree = !!body.isFree
      const priceCents = isFree
        ? 0
        : body.priceCents == null || body.priceCents === ''
          ? null
          : Number(body.priceCents)
      if (
        !isFree &&
        priceCents != null &&
        Number.isFinite(priceCents) &&
        (priceCents < 0 || priceCents > 100_000_000)
      ) {
        return res.status(400).json({ error: 'Precio máximo: $1,000,000.00' })
      }
      const cardLayout =
        String(body.cardLayout || '').toLowerCase() === 'image' && imageUrl
          ? 'image'
          : 'text'

      if (!title || title.length < 3 || title.length > 80) {
        return res.status(400).json({ error: 'Título: mínimo 3 y máximo 80 caracteres' })
      }
      if (!description || description.length < 40 || description.length > 2000) {
        return res.status(400).json({ error: 'Descripción: mínimo 40 y máximo 2000 caracteres' })
      }
      if (!country) {
        return res.status(400).json({ error: 'Elige un país' })
      }
      if (!category || !CATEGORIES.includes(category)) {
        return res.status(400).json({ error: 'Categoría inválida' })
      }

      const duration = getDuration(durationId) || getDuration('30m')
      let zone = 'live'
      let expiresAt = new Date(Date.now() + duration.minutes * 60 * 1000)
      let charge = duration.priceCents

      if (destination === 'top10') {
        zone = 'top10'
        if (!bidCents || bidCents < TOP10_MIN_BID_CENTS) {
          return res.status(400).json({ error: 'Puja mínima 1 céntimo' })
        }
        charge = bidCents
        expiresAt = new Date('2099-01-01T00:00:00.000Z')
      } else if (duration.priceCents > 0 || destination === 'featured') {
        zone = duration.priceCents > 0 ? 'featured' : 'live'
      }

      let pinUntil = null
      if (pinId) {
        const pin = getPin(pinId)
        if (!pin) return res.status(400).json({ error: 'Pin inválido' })
        charge += pin.priceCents
        pinUntil = new Date(Date.now() + pin.minutes * 60 * 1000)
        zone = 'featured'
      }

      if (useMemory) {
        await memory.charge(user, charge, destination === 'top10' ? 'top10_bid' : 'duration', {
          durationId,
          pinId,
          bidCents,
        })
      } else {
        await chargeCredits(
          user._id,
          charge,
          destination === 'top10' ? 'top10_bid' : 'duration',
          { durationId, pinId, bidCents }
        )
      }

      const spamData = {
        ownerId: user._id,
        title,
        description,
        links,
        country,
        socials: {
          instagram: String(socials.instagram || '').slice(0, 200),
          twitter: String(socials.twitter || '').slice(0, 200),
          tiktok: String(socials.tiktok || '').slice(0, 200),
          youtube: String(socials.youtube || '').slice(0, 500),
          web: String(socials.web || '').slice(0, 500),
        },
        imageUrl,
        category,
        priceCents: isFree ? 0 : Number.isFinite(priceCents) ? priceCents : null,
        isFree,
        cardLayout,
        zone,
        expiresAt,
        pinUntil,
        bidCents: destination === 'top10' ? bidCents : 0,
      }

      let spam
      if (useMemory) {
        spam = await memory.createSpam(spamData)
        user.spamCount += 1
        user.checkMeritVerified()
        if (destination === 'top10') {
          await memPlaceTop10(spam, user._id, bidCents)
        }
      } else {
        spam = await Spam().create(spamData)
        const fresh = await User().findById(user._id)
        fresh.spamCount += 1
        fresh.checkMeritVerified()
        await fresh.save()
        if (destination === 'top10') {
          await placeTop10Bid(spam, user._id, bidCents)
        }
      }

      const refreshed = useMemory
        ? hydrateMemoryUser(await memory.findUserById(user._id))
        : await User().findById(user._id)

      res.status(201).json({
        spam: mapSpam(spam, refreshed),
        user: publicUser(refreshed),
      })
    } catch (e) {
      const status = e.code === 'INSUFFICIENT_CREDITS' ? 402 : 400
      res.status(status).json({ error: e.message })
    }
  })

  app.post('/api/wallet/checkout', async (req, res) => {
    try {
      const user = useMemory
        ? await memRequireUser(req, res)
        : await requireUser(req, res)
      if (!user) return

      const amountRaw = req.body?.amountCents
      const packId = req.body?.packId || null
      let pack = null
      if (amountRaw != null && amountRaw !== '') {
        pack = makeWalletAmount(amountRaw)
      } else if (packId) {
        pack = getWalletPack(packId)
      }
      if (!pack) {
        return res.status(400).json({ error: 'Indica un monto válido' })
      }

      const appUrl = process.env.PUBLIC_APP_URL || 'http://localhost:5173'
      const result = await createWalletCheckout({
        user,
        packId: pack.id,
        amountCents: pack.amountCents,
        successUrl: `${appUrl}/?wallet=success&session_id={CHECKOUT_SESSION_ID}`,
        cancelUrl: `${appUrl}/?wallet=cancel`,
      })

      if (result.demo) {
        if (useMemory) {
          await memory.credit(user, pack.creditCents, 'wallet_topup', {
            packId: pack.id,
          })
        } else {
          await addCredits(user._id, pack.creditCents, 'wallet_topup', {
            packId: pack.id,
          })
        }
        const refreshed = useMemory
          ? hydrateMemoryUser(await memory.findUserById(user._id))
          : await User().findById(user._id)
        return res.json({
          demo: true,
          user: publicUser(refreshed),
          message: 'Modo demo: crédito añadido sin Stripe',
        })
      }
      res.json(result)
    } catch (e) {
      res.status(400).json({ error: e.message })
    }
  })

  app.post('/api/shop/unlimited', async (req, res) => {
    try {
      const user = useMemory
        ? await memRequireUser(req, res)
        : await requireUser(req, res)
      if (!user) return
      const appUrl = process.env.PUBLIC_APP_URL || 'http://localhost:5173'
      const result = await createProductCheckout({
        user,
        product: UNLIMITED_PACK,
        successUrl: `${appUrl}/?shop=unlimited&session_id={CHECKOUT_SESSION_ID}`,
        cancelUrl: `${appUrl}/?shop=cancel`,
        metadata: { type: 'unlimited' },
      })
      if (result.demo) {
        await applyUnlimited(user)
        const refreshed = useMemory
          ? hydrateMemoryUser(await memory.findUserById(user._id))
          : await User().findById(user._id)
        return res.json({ demo: true, user: publicUser(refreshed) })
      }
      res.json(result)
    } catch (e) {
      res.status(400).json({ error: e.message })
    }
  })

  app.post('/api/shop/verified', async (req, res) => {
    try {
      const user = useMemory
        ? await memRequireUser(req, res)
        : await requireUser(req, res)
      if (!user) return
      const appUrl = process.env.PUBLIC_APP_URL || 'http://localhost:5173'
      const result = await createProductCheckout({
        user,
        product: VERIFIED_YEARLY,
        successUrl: `${appUrl}/?shop=verified&session_id={CHECKOUT_SESSION_ID}`,
        cancelUrl: `${appUrl}/?shop=cancel`,
        metadata: { type: 'verified' },
      })
      if (result.demo) {
        await applyVerified(user)
        const refreshed = useMemory
          ? hydrateMemoryUser(await memory.findUserById(user._id))
          : await User().findById(user._id)
        return res.json({ demo: true, user: publicUser(refreshed) })
      }
      res.json(result)
    } catch (e) {
      res.status(400).json({ error: e.message })
    }
  })

  /** Confirma un Checkout tras volver del success_url (útil sin webhook local) */
  app.post('/api/stripe/confirm', async (req, res) => {
    try {
      const user = useMemory
        ? await memRequireUser(req, res)
        : await requireUser(req, res)
      if (!user) return

      const sessionId = String(req.body?.sessionId || '')
      if (!sessionId.startsWith('cs_')) {
        return res.status(400).json({ error: 'sessionId inválido' })
      }

      const session = await retrieveCheckoutSession(sessionId)
      if (session.payment_status !== 'paid' && session.status !== 'complete') {
        return res.status(402).json({ error: 'Pago no completado' })
      }

      const metaUser = session.metadata?.userId || session.client_reference_id
      if (metaUser && String(metaUser) !== String(user._id)) {
        return res.status(403).json({ error: 'Sesión de otro usuario' })
      }

      await handleCheckoutCompleted(session)
      const refreshed = useMemory
        ? hydrateMemoryUser(await memory.findUserById(user._id))
        : await User().findById(user._id)
      res.json({ ok: true, user: publicUser(refreshed) })
    } catch (e) {
      res.status(400).json({ error: e.message })
    }
  })

  app.post('/api/banners', async (req, res) => {
    try {
      const user = useMemory
        ? await memRequireUser(req, res)
        : await requireUser(req, res)
      if (!user) return

      const slotKey = BANNER_SLOT_KEYS.includes(req.body?.slotKey)
        ? req.body.slotKey
        : 'left-1'
      const durationId = req.body?.durationId || '1h'
      const duration = getBannerDuration(durationId)
      if (!duration) return res.status(400).json({ error: 'Duración inválida' })

      const imageUrl = String(req.body?.imageUrl || '').trim()
      const linkUrl = String(req.body?.linkUrl || '').trim()
      const title = String(req.body?.title || '').trim().slice(0, 80)
      const description = String(req.body?.description || '').trim().slice(0, 2000)
      const category = String(req.body?.category || '').trim().slice(0, 80)
      const country = String(req.body?.country || '').trim().slice(0, 80)
      const isFree = !!req.body?.isFree
      const priceCents =
        isFree || req.body?.priceCents == null ? (isFree ? 0 : null) : Number(req.body.priceCents)
      const socials = {
        instagram: String(req.body?.socials?.instagram || '').trim().slice(0, 200),
        twitter: String(req.body?.socials?.twitter || '').trim().slice(0, 200),
        tiktok: String(req.body?.socials?.tiktok || '').trim().slice(0, 200),
        youtube: String(req.body?.socials?.youtube || '').trim().slice(0, 300),
        web: String(req.body?.socials?.web || '').trim().slice(0, 500),
      }
      const links = Array.isArray(req.body?.links)
        ? req.body.links.map((l) => String(l || '').trim()).filter(Boolean).slice(0, 6)
        : []

      if (!imageUrl || !/^https?:\/\//i.test(imageUrl)) {
        return res.status(400).json({ error: 'URL de imagen obligatoria (http/https)' })
      }
      if (!title || title.length < 3) {
        return res.status(400).json({ error: 'Título demasiado corto' })
      }
      if (!description || description.length < 40) {
        return res.status(400).json({ error: 'Descripción demasiado corta' })
      }
      if (!category) return res.status(400).json({ error: 'Categoría requerida' })
      if (!country) return res.status(400).json({ error: 'País requerido' })

      const expiresAt = new Date(Date.now() + duration.minutes * 60 * 1000)
      const payload = {
        imageUrl,
        linkUrl: linkUrl || socials.web || links[0] || '',
        title,
        description,
        category,
        country,
        priceCents,
        isFree,
        socials,
        links,
        ownerId: user._id,
        expiresAt,
      }

      if (useMemory) {
        await memory.charge(user, duration.priceCents, 'banner', { slotKey, durationId })
        memory.setBanner(slotKey, payload)
      } else {
        await chargeCredits(user._id, duration.priceCents, 'banner', {
          slotKey,
          durationId,
        })
        await BannerSlot().findOneAndUpdate({ slotKey }, payload, { upsert: true })
      }

      const refreshed = useMemory
        ? hydrateMemoryUser(await memory.findUserById(user._id))
        : await User().findById(user._id)

      res.json({
        ok: true,
        banner: mapBannerPublic({ slotKey, ...payload }),
        user: publicUser(refreshed),
      })
    } catch (e) {
      const status = e.code === 'INSUFFICIENT_CREDITS' ? 402 : 400
      res.status(status).json({ error: e.message })
    }
  })

  app.get('/api/cron/cleanup', async (req, res) => {
    if (!authorizeCron(req)) return res.status(401).json({ error: 'Unauthorized' })
    if (useMemory) {
      memory.cleanup()
      return res.json({ ok: true, store: 'memory' })
    }
    const now = new Date()
    await Spam().deleteMany({ expiresAt: { $lte: now }, zone: { $ne: 'top10' } })
    await BannerSlot().updateMany(
      { expiresAt: { $lte: now } },
      {
        $set: {
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
        },
      }
    )
    res.json({ ok: true })
  })

  app.get('/api/cron/twitter', async (req, res) => {
    if (!authorizeCron(req)) return res.status(401).json({ error: 'Unauthorized' })
    // Stub: logs snapshot; real X API when credentials exist
    const hasTwitter = !!(
      process.env.TWITTER_API_KEY && process.env.TWITTER_ACCESS_TOKEN
    )
    let summary = { top: 0, featured: 0, live: 0 }
    if (useMemory) {
      const top = await memGetTop10()
      const featured = await memory.listSpams({ zone: 'featured' })
      const live = await memory.listSpams({ zone: 'live' })
      summary = {
        top: top.filter((t) => t.spam).length,
        featured: featured.length,
        live: live.length,
      }
    } else {
      summary = {
        top: await TopSlot().countDocuments({ spamId: { $ne: null } }),
        featured: await Spam().countDocuments({
          zone: 'featured',
          expiresAt: { $gt: new Date() },
        }),
        live: await Spam().countDocuments({
          zone: 'live',
          expiresAt: { $gt: new Date() },
        }),
      }
    }

    const text = `Nadie se olvida en SPAMEAR — muro ahora: Top ${summary.top}/10 · Destacados ${summary.featured} · Vivo ${summary.live}. Entra y spamea.`
    const result = await postWallSnapshot({ text })
    console.log('[twitter-cron]', result)

    res.json({ ok: true, ...result, summary, credentialsPresent: hasTwitter })
  })

  async function applyUnlimited(user, stripeSessionId) {
    const until = new Date()
    until.setDate(until.getDate() + UNLIMITED_PACK.vipDays)
    user.vipUntil = until
    if (useMemory) {
      await memory.credit(user, UNLIMITED_PACK.creditCents, 'unlimited', {}, stripeSessionId)
    } else {
      if (stripeSessionId) {
        const already = await Ledger().findOne({ stripeSessionId })
        if (already) return
      }
      await addCredits(
        user._id,
        UNLIMITED_PACK.creditCents,
        'unlimited',
        {},
        stripeSessionId
      )
      const u = await User().findById(user._id)
      u.vipUntil = until
      await u.save()
    }
  }

  async function applyVerified(user, stripeSessionId) {
    const until = new Date()
    until.setDate(until.getDate() + VERIFIED_YEARLY.days)
    user.verifiedUntil = until
    if (useMemory) {
      user.verifiedUntil = until
      return
    }
    if (stripeSessionId) {
      const already = await Ledger().findOne({ stripeSessionId })
      if (already) return
    }
    const u = await User().findById(user._id)
    u.verifiedUntil = until
    u.vipUntil =
      !u.vipUntil || u.vipUntil < new Date(Date.now() + 86400000)
        ? new Date(Date.now() + 86400000)
        : u.vipUntil
    await u.save()
    await Ledger().create({
      userId: user._id,
      type: 'verified',
      amountCents: -VERIFIED_YEARLY.priceCents,
      balanceAfter: u.creditsCents,
      meta: {},
      stripeSessionId,
    })
  }

  async function handleCheckoutCompleted(session) {
    const meta = session.metadata || {}
    const userId = meta.userId || session.client_reference_id
    if (!userId || !session.id) return

    // Idempotencia: no aplicar dos veces la misma sesión
    if (!useMemory) {
      const already = await Ledger().findOne({ stripeSessionId: session.id })
      if (already) return
    }

    if (meta.type === 'wallet_topup') {
      const credit = Number(meta.creditCents || 0)
      if (useMemory) {
        const u = hydrateMemoryUser(await memory.findUserById(userId))
        if (u) await memory.credit(u, credit, 'wallet_topup', meta, session.id)
      } else {
        await addCredits(userId, credit, 'wallet_topup', meta, session.id)
        const u = await User().findById(userId)
        if (!u) return
        const boost = new Date(Date.now() + 86400000)
        if (!u.vipUntil || u.vipUntil < boost) {
          u.vipUntil = boost
          await u.save()
        }
      }
    } else if (meta.type === 'unlimited') {
      const u = useMemory
        ? hydrateMemoryUser(await memory.findUserById(userId))
        : await User().findById(userId)
      if (u) await applyUnlimited(u, session.id)
    } else if (meta.type === 'verified') {
      const u = useMemory
        ? hydrateMemoryUser(await memory.findUserById(userId))
        : await User().findById(userId)
      if (u) await applyVerified(u, session.id)
    }
  }

  function authorizeCron(req) {
    const secret = process.env.CRON_SECRET
    if (!secret) return process.env.NODE_ENV !== 'production'
    return (
      req.headers.authorization === `Bearer ${secret}` ||
      req.query.secret === secret
    )
  }

  // Fix unused vars in feed memory branch - clean up the messy top variable
  // (already returns topProper)

  return app
}
