import { test, expect } from '@playwright/test'

const TEST_EMAIL = `e2e.datingprefs.${Date.now()}@froggle.org`

function createMinimalPng(): Buffer {
  const pngBytes = [
    137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 13, 73, 72, 68, 82, 0, 0, 0, 1, 0, 0, 0, 1, 8, 2, 0,
    0, 0, 144, 119, 83, 222, 0, 0, 0, 12, 73, 68, 65, 84, 120, 156, 99, 248, 207, 192, 0, 0, 3, 1,
    1, 0, 201, 254, 146, 239, 0, 0, 0, 0, 73, 69, 78, 68, 174, 66, 96, 130,
  ]
  return Buffer.from(pngBytes)
}

const STEP_DELAY = 1500

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

  // In dev mode, no OTP is needed — just click Continue
  await page.getByRole('button', { name: /continue/i }).click()

  await page.waitForURL(/\/(home|onboarding)/, { timeout: 15000 })
  if (!page.url().includes('/onboarding')) {
    await page.goto('/onboarding')
  }
  await page.waitForURL('**/onboarding', { timeout: 10000 })
  await page.waitForTimeout(STEP_DELAY)
}

async function clickNext(page: any) {
  const nextBtn = page.getByRole('button', { name: /next/i })
  await expect(nextBtn).toBeEnabled({ timeout: 5000 })
  await page.waitForTimeout(STEP_DELAY)
  await nextBtn.click()
}

test.describe('Dating preferences defaults during onboarding', () => {
  test('prefGender and age range are prepopulated based on user profile data', async ({ page }) => {
    test.setTimeout(180_000)

    await loginAndReachOnboarding(page, TEST_EMAIL)

    // ── Step 1: publicname ──
    await expect(page.locator('#publicName')).toBeVisible({ timeout: 10000 })
    await page.locator('#publicName').fill('PrefsTest')
    await clickNext(page)

    // ── Step 2: location ──
    const locationMultiselect = page.locator('.interests-multiselect .multiselect').first()
    await expect(locationMultiselect).toBeVisible({ timeout: 10000 })
    await locationMultiselect.click()
    const locationInput = page.locator('.interests-multiselect .multiselect__input').first()
    await locationInput.type('London', { delay: 50 })
    await expect(page.locator('.multiselect__option').first()).toBeVisible({ timeout: 10000 })
    await page.locator('.multiselect__option').first().click()
    await clickNext(page)

    // ── Step 3: interests ──
    const tagsMultiselect = page.locator('.interests-multiselect .multiselect').first()
    await expect(tagsMultiselect).toBeVisible({ timeout: 10000 })
    await tagsMultiselect.click()
    const tagsInput = page.locator('.interests-multiselect .multiselect__input').first()
    await tagsInput.type('music', { delay: 50 })
    await expect(page.locator('.multiselect__option').first()).toBeVisible({ timeout: 8000 })
    await page.locator('.multiselect__option').first().click()
    await page.keyboard.press('Escape')
    await clickNext(page)

    // ── Step 4: languages (pre-populated) ──
    await expect(page.getByText('I speak...', { exact: true })).toBeVisible({ timeout: 10000 })
    await clickNext(page)

    // ── Step 5: introSocial (optional, skip) ──
    await expect(page.locator('textarea')).toBeVisible({ timeout: 10000 })
    await clickNext(page)

    // ── Step 6: photos ──
    await expect(page.getByText('I look like...', { exact: true })).toBeVisible({ timeout: 10000 })
    const fileInput = page.locator('#image-upload-input').first()
    await expect(fileInput).toBeAttached({ timeout: 10000 })
    await fileInput.setInputFiles({
      name: 'test-photo.png',
      mimeType: 'image/png',
      buffer: createMinimalPng(),
    })
    const looksGoodButton = page.getByRole('button', { name: /looks good/i })
    await expect(looksGoodButton).toBeVisible({ timeout: 15000 })
    await page.waitForTimeout(STEP_DELAY)
    await looksGoodButton.click()
    await expect(page.locator('.thumbnail').first()).toBeVisible({ timeout: 15000 })
    await clickNext(page)

    // ── Step 7: dating_mode — toggle ON ──
    const datingCheckbox = page.getByRole('checkbox', { name: /dating mode/i })
    await expect(datingCheckbox).toBeVisible({ timeout: 10000 })
    await datingCheckbox.check()
    await expect(datingCheckbox).toBeChecked()
    await clickNext(page)

    // ── Step 8: age — set birthday to 1990 (age ~35) via Vue internals ──
    await expect(page.getByText('I was born...', { exact: true })).toBeVisible({ timeout: 10000 })
    await page.evaluate(() => {
      const app = (document.querySelector('#app') as any).__vue_app__
      const piniaSymbol = Object.getOwnPropertySymbols(app._context.provides).find((s: symbol) =>
        s.toString().includes('pinia')
      )
      const findComponent = (instance: any, name: string): any => {
        if (!instance) return null
        if (instance.type?.__name === name || instance.type?.name === name) return instance
        if (instance.subTree) {
          const children = instance.subTree.children
          if (Array.isArray(children)) {
            for (const child of children) {
              if (child?.component) {
                const result = findComponent(child.component, name)
                if (result) return result
              }
            }
          }
          if (instance.subTree.component) {
            const result = findComponent(instance.subTree.component, name)
            if (result) return result
          }
        }
        return null
      }
      const onboarding = findComponent(app._instance, 'Onboarding')
      if (onboarding) {
        onboarding.setupState.profileForm.birthday = new Date('1990-06-15')
      }
    })
    await clickNext(page)

    // ── Step 9: gender — select Male ──
    // After this, the DatingSteps watch fires with all conditions met:
    // isDatingActive=true, birthday set, gender="male"
    // → populates prefGender: ["female"], age range: 30-40
    await expect(page.getByText('I identify as...', { exact: true })).toBeVisible({
      timeout: 10000,
    })
    await page.getByRole('radio', { name: 'Male' }).click()
    await clickNext(page)

    // ── Step 10: family_situation ──
    await expect(page.getByText('I am...', { exact: true })).toBeVisible({ timeout: 10000 })
    await page.getByRole('radio', { name: 'Single' }).click()
    await page.getByRole('radio', { name: /^No$/i }).click()
    await clickNext(page)

    // ── Step 11: introDating (optional, skip) ──
    await expect(page.getByText('I would like to find:', { exact: true })).toBeVisible({
      timeout: 10000,
    })
    await clickNext(page)

    // ── Step 12: preferences — VERIFY SMART DEFAULTS ──
    await expect(page.getByText('My preferences', { exact: true })).toBeVisible({ timeout: 10000 })

    // prefGender: "Female" checked (opposite of user's "Male")
    const femaleCheckbox = page.getByRole('checkbox', { name: 'Female' })
    await expect(femaleCheckbox).toBeChecked()

    // "Male" should NOT be checked
    const maleCheckbox = page.getByRole('checkbox', { name: 'Male' })
    await expect(maleCheckbox).not.toBeChecked()

    // Age range: 30-40 (age 35 ± 5, clamped to [18, 80])
    await expect(page.getByText('30')).toBeVisible()
    await expect(page.getByText('40')).toBeVisible()

    // Kids: both "Has kids" and "No kids" checked
    await expect(page.getByRole('checkbox', { name: /has kids/i })).toBeChecked()
    await expect(page.getByRole('checkbox', { name: /no kids/i })).toBeChecked()

    // Complete onboarding
    await clickNext(page)

    // ── Confirm step ──
    await expect(page.getByRole('button', { name: /meet people/i })).toBeVisible({
      timeout: 20000,
    })

    // Verify persisted values via Pinia store
    const datingPrefs = await page.evaluate(() => {
      const app = (document.querySelector('#app') as any).__vue_app__
      const piniaSymbol = Object.getOwnPropertySymbols(app._context.provides).find((s: symbol) =>
        s.toString().includes('pinia')
      )
      const pinia = app._context.provides[piniaSymbol!]
      const store = pinia._s.get('ownerProfile')
      const profile = store?.profile
      if (!profile) return null
      return {
        prefAgeMin: profile.prefAgeMin,
        prefAgeMax: profile.prefAgeMax,
        prefGender: profile.prefGender,
        prefKids: profile.prefKids,
        isDatingActive: profile.isDatingActive,
      }
    })

    expect(datingPrefs).not.toBeNull()
    expect(datingPrefs!.prefAgeMin).toBe(30)
    expect(datingPrefs!.prefAgeMax).toBe(40)
    expect(datingPrefs!.prefGender).toEqual(['female'])
    expect(datingPrefs!.prefKids).toEqual(expect.arrayContaining(['yes', 'no']))
    expect(datingPrefs!.isDatingActive).toBe(true)
  })
})
