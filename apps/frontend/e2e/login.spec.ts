import { test, expect } from '@playwright/test'

const MAILDEV_API = process.env.MAILDEV_URL || 'http://localhost:1080'
const TEST_EMAIL = 'e2e-login@froggle.org'

async function deleteAllEmails() {
  await fetch(`${MAILDEV_API}/email/all`, { method: 'DELETE' })
}

async function getLatestOtp(): Promise<string> {
  for (let i = 0; i < 20; i++) {
    const res = await fetch(`${MAILDEV_API}/email`)
    const emails = await res.json()
    const match = emails.find(
      (e: any) =>
        e.to?.[0]?.address === TEST_EMAIL &&
        e.subject?.toLowerCase().includes('login')
    )
    if (match) {
      // OTP may be in text or html body
      const body = match.text || match.html || ''
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

    // 6. Fetch OTP from MailDev
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
