import { test as setup } from '@playwright/test'
import fs from 'node:fs'
import path from 'node:path'

const MAILDEV_API = process.env.MAILDEV_URL || 'http://localhost:1080'
const TEST_EMAIL = 'mookie@froggle.org'
const STORAGE_STATE = path.join(import.meta.dirname, '.auth/user.json')

async function deleteAllEmails() {
  await fetch(`${MAILDEV_API}/email/all`, { method: 'DELETE' })
}

async function getLatestOtp(): Promise<string> {
  for (let i = 0; i < 30; i++) {
    const res = await fetch(`${MAILDEV_API}/email`)
    const emails = await res.json()
    const match = emails.find(
      (e: any) =>
        e.to?.[0]?.address === TEST_EMAIL && e.subject?.toLowerCase().includes('login')
    )
    if (match) {
      const body = match.text || match.html || ''
      const otpMatch = body.match(/\b(\d{6})\b/)
      if (otpMatch) return otpMatch[1]
    }
    await new Promise((r) => setTimeout(r, 500))
  }
  throw new Error('Login email not received within timeout')
}

setup('authenticate', async ({ page }) => {
  await deleteAllEmails()

  await page.goto('/auth', { waitUntil: 'domcontentloaded' })
  await page.locator('#authIdInput').waitFor({ timeout: 15000 })
  await page.locator('#authIdInput').fill(TEST_EMAIL)

  // Solve the altcha captcha
  const altchaCheckbox = page.locator('altcha-widget').locator('input[type="checkbox"]')
  await altchaCheckbox.click()

  // Wait for captcha to solve and button to be enabled
  await page.getByRole('button', { name: /login/i }).waitFor({ state: 'attached', timeout: 30000 })
  await page.waitForFunction(
    () => {
      const btn = document.querySelector('button[type="submit"], button') as HTMLButtonElement | null
      return btn && !btn.disabled
    },
    { timeout: 90000 }
  )
  await page.getByRole('button', { name: /login/i }).click()

  await page.waitForURL('**/auth/otp', { timeout: 15000 })

  const otp = await getLatestOtp()
  await page.locator('#otp').fill(otp)

  // Use keyboard.press to avoid element-detach on navigation
  await page.keyboard.press('Enter')
  await page.waitForURL(/\/(home|onboarding)/, { timeout: 30000 })

  // Build storageState manually from localStorage (page.context().storageState() hangs due to WS)
  const origins = await page.evaluate(() => {
    const entries: { name: string; value: string }[] = []
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key) entries.push({ name: key, value: localStorage.getItem(key) || '' })
    }
    return entries
  })

  const storageState = {
    cookies: [],
    origins: [
      {
        origin: new URL(page.url()).origin,
        localStorage: origins,
      },
    ],
  }

  fs.mkdirSync(path.dirname(STORAGE_STATE), { recursive: true })
  fs.writeFileSync(STORAGE_STATE, JSON.stringify(storageState, null, 2))
})
