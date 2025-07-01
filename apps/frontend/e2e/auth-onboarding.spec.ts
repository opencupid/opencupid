import { test, expect } from '@playwright/test'

const testUser = {
  id: 'usr1',
  email: 'test@example.com',
  phonenumber: '',
  isRegistrationConfirmed: false,
  language: 'en'
}

const fakeJwt = 'FAKE.JWT.TOKEN'

// Utility to stub API routes used during signup and onboarding
async function stubApi(page) {
  await page.route('**/api/users/send-login-link', async route => {
    const payload = JSON.parse(route.request().postData() || '{}')
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        user: { ...testUser, email: payload.email },
        status: 'register'
      })
    })
  })

  await page.route('**/api/users/otp-login**', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true, token: fakeJwt })
    })
  })

  await page.route('**/api/profiles/me', async route => {
    if (route.request().method() === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          profile: { id: 'prof1', isOnboarded: false, isSocialActive: false, isDatingActive: false }
        })
      })
    } else {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          profile: { id: 'prof1', isOnboarded: true, isSocialActive: true, isDatingActive: false }
        })
      })
    }
  })
}

test.describe('User signup and onboarding', () => {
  test('registration redirects to OTP', async ({ page }) => {
    await stubApi(page)
    await page.goto('/auth')
    await page.locator('#authIdInput').fill(testUser.email)
    await page.locator('altcha-widget').evaluate(el => {
      el.dispatchEvent(new CustomEvent('statechange', { detail: { state: 'verified', payload: 'ok' } }))
    })
    await page.getByRole('button', { name: /login/i }).click()
    await expect(page).toHaveURL('/auth/otp')
  })

  test('otp login redirects to onboarding', async ({ page }) => {
    await stubApi(page)
    await page.goto('/auth/otp')
    await page.locator('#otp').fill('123456')
    await page.locator('#otp').press('Enter')
    await page.waitForURL('/onboarding')
    await expect(page).toHaveURL('/onboarding')
  })

  test('submitting onboarding creates profile', async ({ page }) => {
    await stubApi(page)
    await page.goto('/onboarding')
    await page.locator('#publicName').fill('Tester')
    await page.locator('.btn-social-toggle').click()
    await page.getByRole('button', { name: /next/i }).click()
    // additional onboarding steps would be completed here
  })
})
