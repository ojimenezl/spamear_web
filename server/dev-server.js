import 'dotenv/config'
import { createApp } from './app.js'

const port = Number(process.env.PORT || 3001)

const app = await createApp()
app.listen(port, () => {
  console.log(`[spamear] API http://localhost:${port}`)
})
