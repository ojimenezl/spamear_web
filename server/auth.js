import jwt from 'jsonwebtoken'
import { OAuth2Client } from 'google-auth-library'
import { User } from './models.js'

const googleClient = () =>
  new OAuth2Client(
    process.env.GOOGLE_CLIENT_ID ||
      process.env.VITE_GOOGLE_CLIENT_ID ||
      process.env.GOOGLE_ID_CLIENTE
  )

export function signToken(user) {
  const secret = process.env.JWT_SECRET || 'dev-secret-change-me'
  return jwt.sign(
    { sub: String(user._id), email: user.email },
    secret,
    { expiresIn: '30d' }
  )
}

export function verifyToken(token) {
  const secret = process.env.JWT_SECRET || 'dev-secret-change-me'
  return jwt.verify(token, secret)
}

export async function getUserFromRequest(req) {
  const header = req.headers.authorization || req.headers.Authorization
  if (!header?.startsWith('Bearer ')) return null
  try {
    const payload = verifyToken(header.slice(7))
    const user = await User().findById(payload.sub)
    if (user) {
      user.touchActiveDay()
      await user.save()
    }
    return user
  } catch {
    return null
  }
}

export async function requireUser(req, res) {
  const user = await getUserFromRequest(req)
  if (!user) {
    res.status(401).json({ error: 'Inicia sesión con Google' })
    return null
  }
  return user
}

export async function loginWithGoogleIdToken(idToken) {
  const clientId =
    process.env.GOOGLE_CLIENT_ID ||
    process.env.VITE_GOOGLE_CLIENT_ID ||
    process.env.GOOGLE_ID_CLIENTE

  if (!clientId) throw new Error('GOOGLE_CLIENT_ID no configurado')
  if (!idToken) throw new Error('idToken requerido')

  const ticket = await googleClient().verifyIdToken({
    idToken,
    audience: clientId,
  })
  const payload = ticket.getPayload()
  if (!payload?.email) throw new Error('Google token inválido')

  let user = await User().findOne({ email: payload.email })
  if (!user) {
    user = await User().create({
      googleId: payload.sub,
      email: payload.email,
      name: payload.name || payload.email.split('@')[0],
      avatar: payload.picture,
      creditsCents: 0,
    })
  } else {
    user.googleId = payload.sub
    user.name = payload.name || user.name
    user.avatar = payload.picture || user.avatar
    user.touchActiveDay()
    await user.save()
  }

  return { user, token: signToken(user) }
}

export function publicUser(user) {
  const vip =
    typeof user.isVip === 'function'
      ? user.isVip()
      : user.vipUntil && new Date(user.vipUntil) > new Date()
  const verified =
    typeof user.isVerified === 'function'
      ? user.isVerified()
      : !!(
          user.verifiedMerit ||
          (user.verifiedUntil && new Date(user.verifiedUntil) > new Date())
        )
  return {
    id: String(user._id),
    email: user.email,
    name: user.name,
    avatar: user.avatar,
    creditsCents: user.creditsCents,
    vip: !!vip,
    vipUntil: user.vipUntil,
    verified: !!verified,
    verifiedUntil: user.verifiedUntil,
    verifiedMerit: user.verifiedMerit,
    spamCount: user.spamCount,
    activeDaysCount: user.activeDays?.length || 0,
  }
}
