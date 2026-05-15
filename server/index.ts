import 'dotenv/config'
import { createApp } from './createApp.ts'

const PORT = Number(process.env.PORT) || 8787

const app = createApp()
app.listen(PORT, () => {
  console.log(`[novamind-demo] API listening on http://localhost:${PORT}`)
})
