import { test, expect } from '@playwright/test'

const MAILPIT_API = process.env.MAILPIT_URL || 'http://localhost:1080'
const TEST_EMAIL = 'e2e-login@froggle.org'

async function deleteAllEmails() {
  await fetch(`${MAILPIT_API}/api/v1/messages`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ IDs: [] }),
  })
}

async function getLatestOtp(): Promise<string> {
  for (let i = 0; i < 20; i++) {
    const res = await fetch(`${MAILPIT_API}/api/v1/messages`)
    const data = await res.json()
    const match = (data.messages ?? []).find(
      (e: any) =>
        e.To?.[0]?.Address === TEST_EMAIL &&
        e.Subject?.toLowerCase().includes('login')
    )
    if (match) {
      const msgRes = await fetch(`${MAILPIT_API}/api/v1/message/${match.ID}`)
      const msg = await msgRes.json()
      const body = msg.Text || msg.HTML || ''
      const otpMatch = body.match(/\b(\d{6})\b/)
      if (otpMatch) return otpMatch[1]
    }
    await new Promise((r) => setTimeout(r, 500))
  }
  throw new Error('Login email not received within timeout')
}

test.describe('Login flow (e2e)', () => {
  test.beforeEach(async () => {
    await deleteAllEmails()
  })

  test('logs in with magic link OTP and reaches home page', async ({ page }) => {
    // 1. Navigate to login page
    await page.goto('/auth')
    await expect(page.locator('#authIdInput')).toBeVisible()

    // 2. Enter email
    await page.locator('#authIdInput').fill(TEST_EMAIL)

    // 3. Solve the altcha captcha by clicking the checkbox inside its shadow DOM
    const altchaCheckbox = page.locator('altcha-widget').locator('input[type="checkbox"]')
    await altchaCheckbox.click()

    // Wait for the captcha to verify (it solves a challenge)
    await expect(page.getByRole('button', { name: /login/i })).toBeEnabled({ timeout: 15000 })

    // 4. Click login
    await page.getByRole('button', { name: /login/i }).click()

    // 5. Should redirect to OTP page
    await page.waitForURL('**/auth/otp', { timeout: 10000 })

    // 6. Fetch OTP from Mailpit
    const otp = await getLatestOtp()
    expect(otp).toMatch(/^\d{6}$/)

    // 7. Enter OTP code — the input auto-submits on valid 6-digit input,
    //    so dispatch change to trigger the watcher; ignore detach errors
    //    since the element disappears during navigation.
    await page.locator('#otp').fill(otp)
    await page
      .locator('#otp')
      .evaluate((el: HTMLInputElement) => {
        el.dispatchEvent(new Event('change', { bubbles: true }))
      })
      .catch(() => {
        /* navigated away — expected */
      })

    // 8. Should redirect to home (or onboarding for new users)
    await page.waitForURL(/\/(home|onboarding)/, { timeout: 10000 })
    const url = page.url()
    expect(url).toMatch(/\/(home|onboarding)/)
  })
})
