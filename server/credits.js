import { Ledger, User } from './models.js'

export async function chargeCredits(userId, amountCents, type, meta = {}) {
  if (amountCents < 0) throw new Error('Monto inválido')
  if (amountCents === 0) {
    const user = await User().findById(userId)
    return user
  }

  const user = await User().findOneAndUpdate(
    { _id: userId, creditsCents: { $gte: amountCents } },
    { $inc: { creditsCents: -amountCents } },
    { new: true }
  )

  if (!user) {
    const err = new Error('Crédito insuficiente. Recarga tu monedero.')
    err.code = 'INSUFFICIENT_CREDITS'
    throw err
  }

  await Ledger().create({
    userId,
    type,
    amountCents: -amountCents,
    balanceAfter: user.creditsCents,
    meta,
  })

  // Cualquier gasto activa VIP 24h mínimo (prioridad de cola)
  const vipBoost = new Date(Date.now() + 24 * 60 * 60 * 1000)
  if (!user.vipUntil || user.vipUntil < vipBoost) {
    user.vipUntil = vipBoost
    await user.save()
  }

  return user
}

export async function addCredits(userId, amountCents, type, meta = {}, stripeSessionId) {
  const user = await User().findByIdAndUpdate(
    userId,
    { $inc: { creditsCents: amountCents } },
    { new: true }
  )
  if (!user) throw new Error('Usuario no encontrado')

  await Ledger().create({
    userId,
    type,
    amountCents,
    balanceAfter: user.creditsCents,
    meta,
    stripeSessionId,
  })

  return user
}
