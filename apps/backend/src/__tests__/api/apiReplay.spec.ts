// tests/apiReplay.test.ts
import { describe, it, expect } from 'vitest'
import axios from 'axios'
import fs from 'fs/promises'
import path from 'path'
import { RecordedRequest ,LOG_DIR} from '../../plugins/api-recorder'

// const LOG_DIR = path.join(process.cwd(), 'api-recordings')
const BASE_URL = process.env.REPLAY_API_BASE ?? 'http://localhost:3000'

function sanitizeHeaders(headers: Record<string, string | undefined>) {
  const { cookie, authorization, ...cleaned } = headers
  return cleaned
}

describe('Replay captured API requests', async () => {
  const files = (await fs.readdir(LOG_DIR)).filter(f => f.endsWith('.json'))

  for (const file of files) {
    const fullPath = path.join(LOG_DIR, file)
    const json = await fs.readFile(fullPath, 'utf-8')
    console.log(`Replaying ${file}...`,json)
    const data = JSON.parse(json) as RecordedRequest

    it(`${data.method} ${data.url}`, async () => {
      const res = await axios.request({
        method: data.method,
        url: BASE_URL + data.url,
        params: data.query,
        data: data.body,
        headers: sanitizeHeaders(data.headers),
        validateStatus: () => true, // allow error responses for comparison
      })

      expect(res.status).toBe(data.status)
      expect(res.data).toMatchObject(data.response)
    })
  }
})
