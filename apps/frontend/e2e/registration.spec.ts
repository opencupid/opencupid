import { test, expect } from '@playwright/test'

const MAILDEV_API = process.env.MAILDEV_URL || 'http://localhost:1080'
// Use a timestamped email (dots only, no +) so each run creates a fresh unregistered user
const TEST_EMAIL = `e2e.register.${Date.now()}@froggle.org`

async function deleteEmailsForAddress(address: string) {
  const res = await fetch(`${MAILDEV_API}/email`)
  const emails = await res.json()
  const toDelete = emails.filter((e: any) => e.to?.[0]?.address === address)
  for (const email of toDelete) {
    await fetch(`${MAILDEV_API}/email/${email.id}`, { method: 'DELETE' })
  }
}

async function getLatestOtpForAddress(address: string): Promise<string> {
  for (let i = 0; i < 30; i++) {
    const res = await fetch(`${MAILDEV_API}/email`)
    const emails = await res.json()
    const match = emails.find(
      (e: any) =>
        e.to?.[0]?.address === address && e.subject?.toLowerCase().includes('login')
    )
    if (match) {
      const body = match.text || match.html || ''
      const otpMatch = body.match(/\b(\d{6})\b/)
      if (otpMatch) return otpMatch[1]
    }
    await new Promise((r) => setTimeout(r, 500))
  }
  throw new Error(`Login email not received for ${address} within timeout`)
}

/**
 * Returns a valid minimal 1x1 red PNG as a Buffer.
 * Generated with Node zlib — verified correct CRCs and IDAT.
 */
function createMinimalPng(): Buffer {
  const pngBytes = [
    137,80,78,71,13,10,26,10,    // PNG signature
    0,0,0,13,                     // IHDR length: 13
    73,72,68,82,                  // "IHDR"
    0,0,0,1,0,0,0,1,8,2,0,0,0,  // width=1, height=1, 8-bit RGB
    144,119,83,222,               // IHDR CRC
    0,0,0,12,                    // IDAT length: 12
    73,68,65,84,                  // "IDAT"
    120,156,99,248,207,192,0,0,3,1,1,0, // zlib-compressed scanline (filter=0, R=255 G=0 B=0)
    201,254,146,239,              // IDAT CRC
    0,0,0,0,                     // IEND length: 0
    73,69,78,68,                  // "IEND"
    174,66,96,130,                // IEND CRC
  ]
  return Buffer.from(pngBytes)
}

const STEP_DELAY = 1500 // ms between steps to avoid rate limits

test.describe('Registration and onboarding flow (e2e)', () => {
  test.beforeEach(async () => {
    await deleteEmailsForAddress(TEST_EMAIL)
  })

  /**
   * Shared helper: log in with a given email, solve captcha, submit OTP, land on onboarding.
   */
  async function loginAndReachOnboarding(page: any, email: string) {
    await page.goto('/auth')
    await expect(page.locator('#authIdInput')).toBeVisible({ timeout: 15000 })
    await page.locator('#authIdInput').fill(email)

    const altchaCheckbox = page.locator('altcha-widget').locator('input[type="checkbox"]')
    await altchaCheckbox.click()
    await expect(page.getByRole('button', { name: /login/i })).toBeEnabled({ timeout: 15000 })

    await page.waitForTimeout(STEP_DELAY)
    await page.getByRole('button', { name: /login/i }).click()
    await page.waitForURL('**/auth/otp', { timeout: 10000 })
    await page.waitForTimeout(STEP_DELAY)

    const otp = await getLatestOtpForAddress(email)
    expect(otp).toMatch(/^\d{6}$/)

    await page.locator('#otp').fill(otp)
    // Dispatch change to trigger the lazy v-model watcher (auto-submits on valid 6-digit input).
    // Ignore detach errors — the element disappears during navigation, which is expected.
    await page.locator('#otp').evaluate((el: HTMLInputElement) => {
      el.dispatchEvent(new Event('change', { bubbles: true }))
    }).catch(() => {/* navigated away — expected */})

    await page.waitForURL(/\/(home|onboarding)/, { timeout: 15000 })
    if (!page.url().includes('/onboarding')) {
      await page.goto('/onboarding')
    }
    await page.waitForURL('**/onboarding', { timeout: 10000 })
    await page.waitForTimeout(STEP_DELAY)
  }

  test('registers a new user and completes the onboarding wizard (social only)', async ({ page }) => {
    test.setTimeout(120_000)

    await loginAndReachOnboarding(page, TEST_EMAIL)

    // ----------------------------------------------------------------
    // Step 3: publicname step
    // ----------------------------------------------------------------
    await expect(page.locator('#publicName')).toBeVisible({ timeout: 10000 })
    await page.locator('#publicName').fill('TestUser')

    await expect(page.getByRole('button', { name: /next/i })).toBeEnabled({ timeout: 5000 })
    await page.waitForTimeout(STEP_DELAY)
    await page.getByRole('button', { name: /next/i }).click()

    // ----------------------------------------------------------------
    // Step 4: location step
    // ----------------------------------------------------------------
    // Click the multiselect container to open it (input is hidden until opened)
    const locationMultiselect = page.locator('.interests-multiselect .multiselect').first()
    await expect(locationMultiselect).toBeVisible({ timeout: 10000 })
    await locationMultiselect.click()
    const locationInput = page.locator('.interests-multiselect .multiselect__input').first()
    await locationInput.type('London', { delay: 50 })

    // Wait for dropdown options (debounced 500ms + network)
    await expect(page.locator('.multiselect__option').first()).toBeVisible({ timeout: 10000 })
    await page.locator('.multiselect__option').first().click()

    await expect(page.getByRole('button', { name: /next/i })).toBeEnabled({ timeout: 5000 })
    await page.waitForTimeout(STEP_DELAY)
    await page.getByRole('button', { name: /next/i }).click()

    // ----------------------------------------------------------------
    // Step 5: looking_for step — isSocialActive defaults to true
    // ----------------------------------------------------------------
    const socialToggle = page.locator('.btn-social-toggle')
    await expect(socialToggle).toBeVisible({ timeout: 10000 })

    // Only click if not already active (it defaults to true)
    const isAlreadyActive = await socialToggle.evaluate((el) => el.classList.contains('active'))
    if (!isAlreadyActive) {
      await socialToggle.click()
    }

    await expect(page.getByRole('button', { name: /next/i })).toBeEnabled({ timeout: 5000 })
    await page.waitForTimeout(STEP_DELAY)
    await page.getByRole('button', { name: /next/i }).click()

    // ----------------------------------------------------------------
    // Step 6: interests step
    // ----------------------------------------------------------------
    const tagsMultiselect = page.locator('.interests-multiselect .multiselect').first()
    await expect(tagsMultiselect).toBeVisible({ timeout: 10000 })
    await tagsMultiselect.click()
    const tagsInput = page.locator('.interests-multiselect .multiselect__input').first()
    await tagsInput.type('music', { delay: 50 })

    // Wait for a dropdown option (existing tag or tag-create option)
    await expect(page.locator('.multiselect__option').first()).toBeVisible({ timeout: 8000 })
    await page.locator('.multiselect__option').first().click()

    // Close dropdown before clicking Next
    await page.keyboard.press('Escape')

    await expect(page.getByRole('button', { name: /next/i })).toBeEnabled({ timeout: 5000 })
    await page.waitForTimeout(STEP_DELAY)
    await page.getByRole('button', { name: /next/i }).click()

    // ----------------------------------------------------------------
    // Step 7: languages step — pre-populated; click Next
    // ----------------------------------------------------------------
    await expect(page.getByText('I speak...', { exact: true })).toBeVisible({ timeout: 10000 })
    await expect(page.getByRole('button', { name: /next/i })).toBeEnabled({ timeout: 5000 })
    await page.waitForTimeout(STEP_DELAY)
    await page.getByRole('button', { name: /next/i }).click()

    // ----------------------------------------------------------------
    // Step 8: introSocial step — optional; click Next immediately
    // ----------------------------------------------------------------
    await expect(page.getByText('About me...', { exact: true })).toBeVisible({ timeout: 10000 })
    await expect(page.getByRole('button', { name: /next/i })).toBeEnabled({ timeout: 5000 })
    await page.waitForTimeout(STEP_DELAY)
    await page.getByRole('button', { name: /next/i }).click()

    // ----------------------------------------------------------------
    // Step 9: photos step — upload a minimal PNG file
    // ----------------------------------------------------------------
    await expect(page.getByText('I look like...', { exact: true })).toBeVisible({ timeout: 10000 })
    const fileInput = page.locator('#image-upload-input').first()
    await expect(fileInput).toBeAttached({ timeout: 10000 })

    const pngBuffer = createMinimalPng()
    await fileInput.setInputFiles({
      name: 'test-photo.png',
      mimeType: 'image/png',
      buffer: pngBuffer,
    })

    // Preview modal appears automatically after file selection
    const looksGoodButton = page.getByRole('button', { name: /looks good/i })
    await expect(looksGoodButton).toBeVisible({ timeout: 15000 })
    await page.waitForTimeout(STEP_DELAY)
    await looksGoodButton.click()

    // Wait for upload to complete — thumbnail appears in the grid
    await expect(page.locator('.thumbnail').first()).toBeVisible({ timeout: 15000 })

    await expect(page.getByRole('button', { name: /next/i })).toBeEnabled({ timeout: 10000 })
    await page.waitForTimeout(STEP_DELAY)
    await page.getByRole('button', { name: /next/i }).click()

    // ----------------------------------------------------------------
    // Step 10: Confirm step — wizard calls createOwnerProfile
    // ----------------------------------------------------------------
    await expect(page.getByRole('button', { name: /meet people/i })).toBeVisible({ timeout: 20000 })
  })

  test('registers a new user and completes the onboarding wizard (social + dating)', async ({ page }) => {
    test.setTimeout(150_000)

    // Use a second unique email for this test run so it doesn't clash with the first test
    const datingEmail = `e2e.dating.${Date.now()}@froggle.org`
    await deleteEmailsForAddress(datingEmail)
    await loginAndReachOnboarding(page, datingEmail)

    // ----------------------------------------------------------------
    // Step 3: publicname step
    // ----------------------------------------------------------------
    await expect(page.locator('#publicName')).toBeVisible({ timeout: 10000 })
    await page.locator('#publicName').fill('DatingUser')

    await expect(page.getByRole('button', { name: /next/i })).toBeEnabled({ timeout: 5000 })
    await page.waitForTimeout(STEP_DELAY)
    await page.getByRole('button', { name: /next/i }).click()

    // ----------------------------------------------------------------
    // Step 4: location step
    // ----------------------------------------------------------------
    const locationMultiselect = page.locator('.interests-multiselect .multiselect').first()
    await expect(locationMultiselect).toBeVisible({ timeout: 10000 })
    await locationMultiselect.click()
    const locationInput = page.locator('.interests-multiselect .multiselect__input').first()
    await locationInput.type('Paris', { delay: 50 })

    await expect(page.locator('.multiselect__option').first()).toBeVisible({ timeout: 10000 })
    await page.locator('.multiselect__option').first().click()

    await expect(page.getByRole('button', { name: /next/i })).toBeEnabled({ timeout: 5000 })
    await page.waitForTimeout(STEP_DELAY)
    await page.getByRole('button', { name: /next/i }).click()

    // ----------------------------------------------------------------
    // Step 5: looking_for step — enable BOTH social and dating
    // ----------------------------------------------------------------
    const socialToggle = page.locator('.btn-social-toggle')
    const datingToggle = page.locator('.btn-dating-toggle')
    await expect(socialToggle).toBeVisible({ timeout: 10000 })

    // Social defaults to true; only click if not already active
    const socialActive = await socialToggle.evaluate((el) => el.classList.contains('active'))
    if (!socialActive) {
      await socialToggle.click()
    }

    // Dating defaults to false; click to activate
    const datingActive = await datingToggle.evaluate((el) => el.classList.contains('active'))
    if (!datingActive) {
      await datingToggle.click()
    }

    await expect(page.getByRole('button', { name: /next/i })).toBeEnabled({ timeout: 5000 })
    await page.waitForTimeout(STEP_DELAY)
    await page.getByRole('button', { name: /next/i }).click()

    // ----------------------------------------------------------------
    // Step 6: interests step
    // ----------------------------------------------------------------
    const tagsMultiselect = page.locator('.interests-multiselect .multiselect').first()
    await expect(tagsMultiselect).toBeVisible({ timeout: 10000 })
    await tagsMultiselect.click()
    const tagsInput = page.locator('.interests-multiselect .multiselect__input').first()
    await tagsInput.type('film', { delay: 50 })

    await expect(page.locator('.multiselect__option').first()).toBeVisible({ timeout: 8000 })
    await page.locator('.multiselect__option').first().click()
    await page.keyboard.press('Escape')

    await expect(page.getByRole('button', { name: /next/i })).toBeEnabled({ timeout: 5000 })
    await page.waitForTimeout(STEP_DELAY)
    await page.getByRole('button', { name: /next/i }).click()

    // ----------------------------------------------------------------
    // Step 7: languages step — pre-populated; click Next
    // ----------------------------------------------------------------
    await expect(page.getByText('I speak...', { exact: true })).toBeVisible({ timeout: 10000 })
    await expect(page.getByRole('button', { name: /next/i })).toBeEnabled({ timeout: 5000 })
    await page.waitForTimeout(STEP_DELAY)
    await page.getByRole('button', { name: /next/i }).click()

    // ----------------------------------------------------------------
    // Step 8: introSocial step — optional; click Next
    // ----------------------------------------------------------------
    await expect(page.getByText('About me...', { exact: true })).toBeVisible({ timeout: 10000 })
    await expect(page.getByRole('button', { name: /next/i })).toBeEnabled({ timeout: 5000 })
    await page.waitForTimeout(STEP_DELAY)
    await page.getByRole('button', { name: /next/i }).click()

    // ----------------------------------------------------------------
    // Step 9: photos step — upload a minimal PNG file
    // ----------------------------------------------------------------
    await expect(page.getByText('I look like...', { exact: true })).toBeVisible({ timeout: 10000 })
    const fileInput = page.locator('#image-upload-input').first()
    await expect(fileInput).toBeAttached({ timeout: 10000 })

    const pngBuffer = createMinimalPng()
    await fileInput.setInputFiles({
      name: 'test-photo.png',
      mimeType: 'image/png',
      buffer: pngBuffer,
    })

    const looksGoodButton = page.getByRole('button', { name: /looks good/i })
    await expect(looksGoodButton).toBeVisible({ timeout: 15000 })
    await page.waitForTimeout(STEP_DELAY)
    await looksGoodButton.click()

    await expect(page.locator('.thumbnail').first()).toBeVisible({ timeout: 15000 })
    await expect(page.getByRole('button', { name: /next/i })).toBeEnabled({ timeout: 10000 })
    await page.waitForTimeout(STEP_DELAY)
    await page.getByRole('button', { name: /next/i }).click()

    // ----------------------------------------------------------------
    // Step 10 (dating): age — slider pre-set to 18 years ago; click Next
    // ----------------------------------------------------------------
    await expect(page.getByText('I was born...', { exact: true })).toBeVisible({ timeout: 10000 })
    await expect(page.getByRole('button', { name: /next/i })).toBeEnabled({ timeout: 5000 })
    await page.waitForTimeout(STEP_DELAY)
    await page.getByRole('button', { name: /next/i }).click()

    // ----------------------------------------------------------------
    // Step 11 (dating): gender — select "Female"
    // ----------------------------------------------------------------
    await expect(page.getByText('I identify as...', { exact: true })).toBeVisible({ timeout: 10000 })
    await page.locator('#list-gender-female').click()

    await expect(page.getByRole('button', { name: /next/i })).toBeEnabled({ timeout: 5000 })
    await page.waitForTimeout(STEP_DELAY)
    await page.getByRole('button', { name: /next/i }).click()

    // ----------------------------------------------------------------
    // Step 12 (dating): family_situation — pick relationship + kids
    // ----------------------------------------------------------------
    await expect(page.getByText('I am...', { exact: true })).toBeVisible({ timeout: 10000 })

    // Pick a relationship status (single)
    await page.locator('#list-relationship-single').click()

    // Pick a kids status (no)
    await page.locator('#list-haskids-no').click()

    await expect(page.getByRole('button', { name: /next/i })).toBeEnabled({ timeout: 5000 })
    await page.waitForTimeout(STEP_DELAY)
    await page.getByRole('button', { name: /next/i }).click()

    // ----------------------------------------------------------------
    // Step 13 (dating): introDating — optional; click Next
    // ----------------------------------------------------------------
    await expect(page.getByText('I would like to find:', { exact: true })).toBeVisible({ timeout: 10000 })
    await expect(page.getByRole('button', { name: /next/i })).toBeEnabled({ timeout: 5000 })
    await page.waitForTimeout(STEP_DELAY)
    await page.getByRole('button', { name: /next/i }).click()

    // ----------------------------------------------------------------
    // Confirm step — wizard calls createOwnerProfile
    // ----------------------------------------------------------------
    await expect(page.getByRole('button', { name: /meet people/i })).toBeVisible({ timeout: 20000 })
  })

  test('registers a new user with dating, non-binary gender, multiple languages/interests, and multilingual intros', async ({ page }) => {
    test.setTimeout(180_000)

    const fullEmail = `e2e.full.${Date.now()}@froggle.org`
    await deleteEmailsForAddress(fullEmail)
    await loginAndReachOnboarding(page, fullEmail)

    // ----------------------------------------------------------------
    // Step 3: publicname
    // ----------------------------------------------------------------
    await expect(page.locator('#publicName')).toBeVisible({ timeout: 10000 })
    await page.locator('#publicName').fill('FullUser')
    await expect(page.getByRole('button', { name: /next/i })).toBeEnabled({ timeout: 5000 })
    await page.waitForTimeout(STEP_DELAY)
    await page.getByRole('button', { name: /next/i }).click()

    // ----------------------------------------------------------------
    // Step 4: location
    // ----------------------------------------------------------------
    const locationMultiselect = page.locator('.interests-multiselect .multiselect').first()
    await expect(locationMultiselect).toBeVisible({ timeout: 10000 })
    await locationMultiselect.click()
    const locationInput = page.locator('.interests-multiselect .multiselect__input').first()
    await locationInput.type('Berlin', { delay: 50 })
    await expect(page.locator('.multiselect__option').first()).toBeVisible({ timeout: 10000 })
    await page.locator('.multiselect__option').first().click()
    await expect(page.getByRole('button', { name: /next/i })).toBeEnabled({ timeout: 5000 })
    await page.waitForTimeout(STEP_DELAY)
    await page.getByRole('button', { name: /next/i }).click()

    // ----------------------------------------------------------------
    // Step 5: looking_for — enable both social AND dating
    // ----------------------------------------------------------------
    const socialToggle = page.locator('.btn-social-toggle')
    const datingToggle = page.locator('.btn-dating-toggle')
    await expect(socialToggle).toBeVisible({ timeout: 10000 })

    const socialActive = await socialToggle.evaluate((el) => el.classList.contains('active'))
    if (!socialActive) await socialToggle.click()

    const datingActive = await datingToggle.evaluate((el) => el.classList.contains('active'))
    if (!datingActive) await datingToggle.click()

    await expect(page.getByRole('button', { name: /next/i })).toBeEnabled({ timeout: 5000 })
    await page.waitForTimeout(STEP_DELAY)
    await page.getByRole('button', { name: /next/i }).click()

    // ----------------------------------------------------------------
    // Step 6: interests — add TWO tags
    // ----------------------------------------------------------------
    const tagsMultiselect = page.locator('.interests-multiselect .multiselect').first()
    await expect(tagsMultiselect).toBeVisible({ timeout: 10000 })
    await tagsMultiselect.click()
    const tagsInput = page.locator('.interests-multiselect .multiselect__input').first()

    await tagsInput.type('jazz', { delay: 50 })
    await expect(page.locator('.multiselect__option').first()).toBeVisible({ timeout: 8000 })
    await page.locator('.multiselect__option').first().click()

    // Type the second tag
    await tagsInput.type('hiking', { delay: 50 })
    await expect(page.locator('.multiselect__option').first()).toBeVisible({ timeout: 8000 })
    await page.locator('.multiselect__option').first().click()

    await page.keyboard.press('Escape')
    await expect(page.getByRole('button', { name: /next/i })).toBeEnabled({ timeout: 5000 })
    await page.waitForTimeout(STEP_DELAY)
    await page.getByRole('button', { name: /next/i }).click()

    // ----------------------------------------------------------------
    // Step 7: languages — add French as a second language
    // ----------------------------------------------------------------
    await expect(page.getByText('I speak...', { exact: true })).toBeVisible({ timeout: 10000 })

    const langMultiselect = page.locator('.languages-multiselect .multiselect').first()
    await langMultiselect.click()
    const langInput = page.locator('.languages-multiselect .multiselect__input').first()
    await langInput.type('French', { delay: 50 })
    await expect(page.locator('.multiselect__option').first()).toBeVisible({ timeout: 8000 })
    await page.locator('.multiselect__option').first().click()
    await page.keyboard.press('Escape')

    await expect(page.getByRole('button', { name: /next/i })).toBeEnabled({ timeout: 5000 })
    await page.waitForTimeout(STEP_DELAY)
    await page.getByRole('button', { name: /next/i }).click()

    // ----------------------------------------------------------------
    // Step 8: introSocial — type in English, then switch to French pill and type
    // ----------------------------------------------------------------
    await expect(page.getByText('About me...', { exact: true })).toBeVisible({ timeout: 10000 })

    // English text (en pill is active by default)
    await page.locator('#content-input').fill('I enjoy music and the outdoors.')

    // Switch to French pill and type French text
    await page.locator('.nav-link[aria-label="fr"]').click()
    await page.locator('#content-input').fill("J'aime la musique et la nature.")

    await expect(page.getByRole('button', { name: /next/i })).toBeEnabled({ timeout: 5000 })
    await page.waitForTimeout(STEP_DELAY)
    await page.getByRole('button', { name: /next/i }).click()

    // ----------------------------------------------------------------
    // Step 9: photos — upload minimal PNG
    // ----------------------------------------------------------------
    await expect(page.getByText('I look like...', { exact: true })).toBeVisible({ timeout: 10000 })
    const fileInput = page.locator('#image-upload-input').first()
    await expect(fileInput).toBeAttached({ timeout: 10000 })

    const pngBuffer = createMinimalPng()
    await fileInput.setInputFiles({
      name: 'test-photo.png',
      mimeType: 'image/png',
      buffer: pngBuffer,
    })

    const looksGoodButton = page.getByRole('button', { name: /looks good/i })
    await expect(looksGoodButton).toBeVisible({ timeout: 15000 })
    await page.waitForTimeout(STEP_DELAY)
    await looksGoodButton.click()

    await expect(page.locator('.thumbnail').first()).toBeVisible({ timeout: 15000 })
    await expect(page.getByRole('button', { name: /next/i })).toBeEnabled({ timeout: 10000 })
    await page.waitForTimeout(STEP_DELAY)
    await page.getByRole('button', { name: /next/i }).click()

    // ----------------------------------------------------------------
    // Step 10 (dating): age — slider defaults to valid; click Next
    // ----------------------------------------------------------------
    await expect(page.getByText('I was born...', { exact: true })).toBeVisible({ timeout: 10000 })
    await expect(page.getByRole('button', { name: /next/i })).toBeEnabled({ timeout: 5000 })
    await page.waitForTimeout(STEP_DELAY)
    await page.getByRole('button', { name: /next/i }).click()

    // ----------------------------------------------------------------
    // Step 11 (dating): gender — click "More options", pick non_binary, pick pronouns
    // ----------------------------------------------------------------
    await expect(page.getByText('I identify as...', { exact: true })).toBeVisible({ timeout: 10000 })

    // Click "More options..." to expand all gender choices
    await page.getByRole('button', { name: /more options/i }).click()
    await expect(page.locator('#list-gender-non_binary')).toBeVisible({ timeout: 5000 })
    await page.locator('#list-gender-non_binary').click()

    // Pronoun selector should now appear for non-binary gender
    await expect(page.locator('#list-pronouns-they_them')).toBeVisible({ timeout: 5000 })
    await page.locator('#list-pronouns-they_them').click()

    await expect(page.getByRole('button', { name: /next/i })).toBeEnabled({ timeout: 5000 })
    await page.waitForTimeout(STEP_DELAY)
    await page.getByRole('button', { name: /next/i }).click()

    // ----------------------------------------------------------------
    // Step 12 (dating): family_situation — pick relationship + kids
    // ----------------------------------------------------------------
    await expect(page.getByText('I am...', { exact: true })).toBeVisible({ timeout: 10000 })
    await page.locator('#list-relationship-single').click()
    await page.locator('#list-haskids-no').click()
    await expect(page.getByRole('button', { name: /next/i })).toBeEnabled({ timeout: 5000 })
    await page.waitForTimeout(STEP_DELAY)
    await page.getByRole('button', { name: /next/i }).click()

    // ----------------------------------------------------------------
    // Step 13 (dating): introDating — type in English, then switch to French
    // ----------------------------------------------------------------
    await expect(page.getByText('I would like to find:', { exact: true })).toBeVisible({ timeout: 10000 })

    await page.locator('#content-input').fill('Looking for genuine connections.')

    // Switch to French pill
    await page.locator('.nav-link[aria-label="fr"]').click()
    await page.locator('#content-input').fill('Je cherche des connexions authentiques.')

    await expect(page.getByRole('button', { name: /next/i })).toBeEnabled({ timeout: 5000 })
    await page.waitForTimeout(STEP_DELAY)
    await page.getByRole('button', { name: /next/i }).click()

    // ----------------------------------------------------------------
    // Confirm step
    // ----------------------------------------------------------------
    await expect(page.getByRole('button', { name: /meet people/i })).toBeVisible({ timeout: 20000 })
  })
})
