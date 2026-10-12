/** Precios en céntimos EUR */
export const DURATIONS = [
  { id: '30m', minutes: 30, priceCents: 0, label: '30 min', free: true },
  { id: '1h', minutes: 60, priceCents: 39, label: '1 hora' },
  { id: '4h', minutes: 240, priceCents: 69, label: '4 horas' },
  { id: '6h', minutes: 360, priceCents: 79, label: '6 horas' },
  { id: '12h', minutes: 720, priceCents: 129, label: '12 horas' },
  { id: '24h', minutes: 1440, priceCents: 199, label: '24 horas' },
]

export const PINS = [
  { id: '1m', minutes: 1, priceCents: 49, label: '1 min' },
  { id: '5m', minutes: 5, priceCents: 99, label: '5 min' },
  { id: '10m', minutes: 10, priceCents: 149, label: '10 min' },
]

export const BANNER_DURATIONS = [
  { id: '1h', minutes: 60, priceCents: 249, label: '1 hora' },
  { id: '4h', minutes: 240, priceCents: 499, label: '4 horas' },
  { id: '6h', minutes: 360, priceCents: 699, label: '6 horas' },
  { id: '12h', minutes: 720, priceCents: 999, label: '12 horas' },
  { id: '24h', minutes: 1440, priceCents: 1499, label: '24 horas' },
]

export const WALLET_PACKS = [
  { id: 'w299', amountCents: 299, creditCents: 299, label: '2,99 €' },
  { id: 'w499', amountCents: 499, creditCents: 499, label: '4,99 €' },
  { id: 'w999', amountCents: 999, creditCents: 999, label: '9,99 €' },
  { id: 'w1999', amountCents: 1999, creditCents: 1999, label: '19,99 €' },
]

/** Mínimo Stripe (EUR/USD) */
export const STRIPE_MIN_CHARGE_CENTS = 50

/** Tope razonable de recarga por sesión */
export const WALLET_MAX_CENTS = 500_00

/** Anuncio de pago más barato (duraciones / pins / banners, sin gratis) */
export function getCheapestPaidAdCents() {
  const prices = [
    ...DURATIONS.filter((d) => d.priceCents > 0).map((d) => d.priceCents),
    ...PINS.map((p) => p.priceCents),
    ...BANNER_DURATIONS.map((b) => b.priceCents),
  ]
  return Math.min(...prices)
}

/**
 * Mínimo del monedero = anuncio más barato de pago,
 * nunca por debajo del mínimo de Stripe.
 */
export function getWalletMinCents() {
  return Math.max(getCheapestPaidAdCents(), STRIPE_MIN_CHARGE_CENTS)
}

export const UNLIMITED_PACK = {
  id: 'unlimited',
  priceCents: 499,
  creditCents: 399,
  vipDays: 30,
  label: 'Ilimitado VIP 4,99 €',
}

export const VERIFIED_YEARLY = {
  id: 'verified',
  priceCents: 3900,
  days: 365,
  label: 'Verificado 39 €/año',
}

export const TOP10_MIN_BID_CENTS = 1
export const FREE_RATE_LIMIT = { windowMs: 60_000, max: 3 }
export const VIP_RATE_LIMIT = { windowMs: 60_000, max: 60 }

export function getDuration(id) {
  return DURATIONS.find((d) => d.id === id)
}

export function getPin(id) {
  return PINS.find((p) => p.id === id)
}

export function getBannerDuration(id) {
  return BANNER_DURATIONS.find((d) => d.id === id)
}

export function getWalletPack(id) {
  return WALLET_PACKS.find((p) => p.id === id)
}

/** Pack dinámico a partir de un monto libre (crédito 1:1) */
export function makeWalletAmount(amountCents) {
  const min = getWalletMinCents()
  const max = WALLET_MAX_CENTS
  const n = Math.round(Number(amountCents) || 0)
  if (!Number.isFinite(n) || n < min) {
    const err = new Error(
      `Mínimo ${formatEur(min)} (anuncio más barato / mínimo Stripe)`
    )
    err.code = 'WALLET_MIN'
    throw err
  }
  if (n > max) {
    const err = new Error(`Máximo ${formatEur(max)} por recarga`)
    err.code = 'WALLET_MAX'
    throw err
  }
  return {
    id: `custom_${n}`,
    amountCents: n,
    creditCents: n,
    label: formatEur(n),
  }
}

export function formatEur(cents) {
  return (cents / 100).toLocaleString('es-ES', {
    style: 'currency',
    currency: 'EUR',
  })
}
