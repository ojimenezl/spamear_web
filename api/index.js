import 'dotenv/config'
import { createApp } from '../server/app.js'

let appPromise

async function getApp() {
  if (!appPromise) appPromise = createApp()
  return appPromise
}

export default async function handler(req, res) {
  const app = await getApp()
  return app(req, res)
}
