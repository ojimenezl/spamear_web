import Stripe from 'stripe'
import {
  UNLIMITED_PACK,
  VERIFIED_YEARLY,
  getWalletPack,
  makeWalletAmount,
} from './pricing.js'
import { User } from './models.js'

/** Servicios digitales — tax code si Managed Payments está activo */
const DIGITAL_TAX_CODE = 'txcd_10000000'

const stripeByMode = { test: null, live: null }

/** Emails (minúsculas) que siempre usan Stripe TEST, aunque el sitio esté en producción */
export function getStripeTestEmails() {
  const raw =
    process.env.STRIPE_TEST_EMAILS ||
    process.env.STRIPE_TEST_EMAIL ||
    'spamear.cia@gmail.com'
  return raw
    .split(/[,;\s]+/)
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean)
}

export function isStripeTestUser(userOrEmail) {
  const email = String(
    typeof userOrEmail === 'string' ? userOrEmail : userOrEmail?.email || ''
  )
    .trim()
    .toLowerCase()
  if (!email) return false
  return getStripeTestEmails().includes(email)
}

export function stripeModeForUser(userOrEmail) {
  return isStripeTestUser(userOrEmail) ? 'test' : 'live'
}

export function stripeModeFromSessionId(sessionId) {
  const id = String(sessionId || '')
  if (id.includes('_test_')) return 'test'
  return 'live'
}

function secretKeyForMode(mode) {
  if (mode === 'test') {
    const test = process.env.STRIPE_SECRET_KEY_TEST
    if (test) return test
    const fallback = process.env.STRIPE_SECRET_KEY || ''
    if (fallback.startsWith('sk_test_')) return fallback
    return null
  }
  const live =
    process.env.STRIPE_SECRET_KEY_LIVE || process.env.STRIPE_SECRET_KEY || ''
  if (live.startsWith('sk_live_')) return live
  // Solo en local sin live: no mezclar test para el resto de usuarios
  return live.startsWith('sk_test_') ? null : live || null
}

export function getStripe(mode = 'live') {
  const key = secretKeyForMode(mode)
  if (!key) return null
  if (!stripeByMode[mode]) {
    stripeByMode[mode] = new Stripe(key, {
      appInfo: {
        name: 'SPAMEAR',
        url: 'https://spamear.com',
      },
    })
  }
  return stripeByMode[mode]
}

/** @deprecated usar getStripe(mode) */
export function getStripeDefault() {
  return getStripe('live') || getStripe('test')
}

function checkoutBase(extra = {}) {
  return {
    managed_payments: { enabled: false },
    ...extra,
  }
}

async function getOrCreateCustomer(user, mode) {
  const stripe = getStripe(mode)
  if (!stripe) return null

  const field = mode === 'test' ? 'stripeCustomerIdTest' : 'stripeCustomerId'
  const existing = user[field]
  if (existing) {
    try {
      await stripe.customers.retrieve(existing)
      return existing
    } catch {
      /* recreate */
    }
  }

  const customer = await stripe.customers.create(
    {
      email: user.email,
      name: user.name || undefined,
      metadata: { userId: String(user._id), stripeMode: mode },
    },
    { idempotencyKey: `cust_${mode}_${user._id}` }
  )

  await User().findByIdAndUpdate(user._id, { [field]: customer.id })
  user[field] = customer.id
  return customer.id
}

function requireStripeForUser(user) {
  const mode = stripeModeForUser(user)
  const stripe = getStripe(mode)
  if (!stripe) {
    if (mode === 'live') {
      throw new Error(
        'Stripe live no configurado. Añade STRIPE_SECRET_KEY_LIVE (sk_live_…) en Vercel.'
      )
    }
    throw new Error(
      'Stripe test no configurado. Añade STRIPE_SECRET_KEY_TEST (sk_test_…).'
    )
  }
  return { stripe, mode }
}

export async function createWalletCheckout({
  user,
  packId,
  amountCents,
  successUrl,
  cancelUrl,
}) {
  let pack = null
  if (amountCents != null && amountCents !== '') {
    pack = makeWalletAmount(amountCents)
  } else {
    pack = getWalletPack(packId)
  }
  if (!pack) throw new Error('Pack o monto inválido')

  const { stripe, mode } = requireStripeForUser(user)
  const customerId = await getOrCreateCustomer(user, mode)

  const session = await stripe.checkout.sessions.create(
    checkoutBase({
      mode: 'payment',
      customer: customerId,
      client_reference_id: String(user._id),
      line_items: [
        {
          price_data: {
            currency: 'eur',
            unit_amount: pack.amountCents,
            product_data: {
              name: `SPAMEAR monedero ${pack.label}`,
              description: `Crédito ${pack.creditCents} céntimos para pujas y boosts`,
              tax_code: DIGITAL_TAX_CODE,
            },
          },
          quantity: 1,
        },
      ],
      invoice_creation: { enabled: true },
      metadata: {
        type: 'wallet_topup',
        userId: String(user._id),
        packId: pack.id,
        creditCents: String(pack.creditCents),
        amountCents: String(pack.amountCents),
        stripeMode: mode,
      },
      success_url: successUrl,
      cancel_url: cancelUrl,
    }),
    {
      idempotencyKey: `wallet_${mode}_${user._id}_${pack.id}_${Math.floor(Date.now() / 60000)}`,
    }
  )

  return { url: session.url, sessionId: session.id, stripeMode: mode }
}

export async function createProductCheckout({
  user,
  product,
  successUrl,
  cancelUrl,
  metadata = {},
}) {
  const { stripe, mode } = requireStripeForUser(user)
  const customerId = await getOrCreateCustomer(user, mode)
  const type = metadata.type || 'product'
  const isVerifiedSub = type === 'verified'

  const session = await stripe.checkout.sessions.create(
    checkoutBase({
      mode: isVerifiedSub ? 'subscription' : 'payment',
      customer: customerId,
      client_reference_id: String(user._id),
      line_items: [
        isVerifiedSub
          ? {
              price_data: {
                currency: 'eur',
                unit_amount: product.priceCents,
                recurring: { interval: 'year' },
                product_data: {
                  name: product.label,
                  description: 'Sello verificado SPAMEAR (renovable cada año)',
                  tax_code: DIGITAL_TAX_CODE,
                },
              },
              quantity: 1,
            }
          : {
              price_data: {
                currency: 'eur',
                unit_amount: product.priceCents,
                product_data: {
                  name: product.label,
                  tax_code: DIGITAL_TAX_CODE,
                },
              },
              quantity: 1,
            },
      ],
      ...(isVerifiedSub ? {} : { invoice_creation: { enabled: true } }),
      metadata: {
        userId: String(user._id),
        stripeMode: mode,
        ...metadata,
      },
      subscription_data: isVerifiedSub
        ? {
            metadata: {
              userId: String(user._id),
              type: 'verified',
              stripeMode: mode,
            },
          }
        : undefined,
      success_url: successUrl,
      cancel_url: cancelUrl,
    }),
    {
      idempotencyKey: `${type}_${mode}_${user._id}_${Math.floor(Date.now() / 60000)}`,
    }
  )

  return { url: session.url, sessionId: session.id, stripeMode: mode }
}

export async function retrieveCheckoutSession(sessionId) {
  const mode = stripeModeFromSessionId(sessionId)
  const stripe = getStripe(mode) || getStripe(mode === 'test' ? 'live' : 'test')
  if (!stripe) throw new Error('Stripe no configurado')
  return stripe.checkout.sessions.retrieve(sessionId)
}

/** Verifica firma de webhook contra secret live o test */
export function constructWebhookEvent(rawBody, signature) {
  const candidates = [
    { mode: 'live', secret: process.env.STRIPE_WEBHOOK_SECRET },
    { mode: 'test', secret: process.env.STRIPE_WEBHOOK_SECRET_TEST },
  ].filter((c) => c.secret)

  let lastErr = null
  for (const { mode, secret } of candidates) {
    const stripe = getStripe(mode)
    if (!stripe) continue
    try {
      const event = stripe.webhooks.constructEvent(rawBody, signature, secret)
      return { event, mode }
    } catch (e) {
      lastErr = e
    }
  }
  throw lastErr || new Error('Webhook secret no configurado')
}

export { UNLIMITED_PACK, VERIFIED_YEARLY }
