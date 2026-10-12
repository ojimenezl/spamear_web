/**
 * Publica resumen del muro en X/Twitter cuando hay credenciales.
 * Sin keys: solo retorna el texto (el cron lo loguea).
 */
export async function postWallSnapshot({ text }) {
  const key = process.env.TWITTER_API_KEY
  const secret = process.env.TWITTER_API_SECRET
  const accessToken = process.env.TWITTER_ACCESS_TOKEN
  const accessSecret = process.env.TWITTER_ACCESS_SECRET

  if (!key || !secret || !accessToken || !accessSecret) {
    return { posted: false, text, reason: 'missing_credentials' }
  }

  try {
    // Carga opcional: npm i twitter-api-v2 cuando quieras activarlo
    const mod = await import('twitter-api-v2').catch(() => null)
    if (!mod) {
      return {
        posted: false,
        text,
        reason: 'Install twitter-api-v2 to enable posting',
      }
    }
    const client = new mod.TwitterApi({
      appKey: key,
      appSecret: secret,
      accessToken,
      accessSecret,
    })
    const rw = client.readWrite
    const result = await rw.v2.tweet(text)
    return { posted: true, text, id: result.data?.id }
  } catch (e) {
    return { posted: false, text, error: e.message }
  }
}
