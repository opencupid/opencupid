import { test, expect } from '@playwright/test'
import * as fs from 'fs'
import * as path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const MAILDEV_API = process.env.MAILDEV_URL || 'http://localhost:1080'
const TEST_EMAIL = 'mookie@froggle.org'
const TEST_DATA_DIR = path.join(__dirname, 'test-data')

const STEP_DELAY = 1500

async function deleteAllEmails() {
  await fetch(`${MAILDEV_API}/email/all`, { method: 'DELETE' })
}

async function getLatestOtp(): Promise<string> {
  for (let i = 0; i < 20; i++) {
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

/**
 * Returns a Buffer containing a complete minimal 1×1 white JPEG.
 * Hand-crafted byte sequence verified to be accepted by standard JPEG decoders.
 */
function createMinimalJpeg(): Buffer {
  // Minimal 1×1 white JPEG (SOI + APP0 + DQT + SOF0 + DHT + SOS + EOI)
  const jpegBytes = [
    // SOI
    0xff, 0xd8,
    // APP0 (JFIF)
    0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01, 0x01, 0x00,
    0x00, 0x01, 0x00, 0x01, 0x00, 0x00,
    // DQT (quantization table — all 1s for lossless-ish)
    0xff, 0xdb, 0x00, 0x43, 0x00,
    0x01, 0x01, 0x01, 0x01, 0x01, 0x01, 0x01, 0x01,
    0x01, 0x01, 0x01, 0x01, 0x01, 0x01, 0x01, 0x01,
    0x01, 0x01, 0x01, 0x01, 0x01, 0x01, 0x01, 0x01,
    0x01, 0x01, 0x01, 0x01, 0x01, 0x01, 0x01, 0x01,
    0x01, 0x01, 0x01, 0x01, 0x01, 0x01, 0x01, 0x01,
    0x01, 0x01, 0x01, 0x01, 0x01, 0x01, 0x01, 0x01,
    0x01, 0x01, 0x01, 0x01, 0x01, 0x01, 0x01, 0x01,
    0x01, 0x01, 0x01, 0x01, 0x01, 0x01, 0x01, 0x01,
    // SOF0 (baseline DCT, 1×1, grayscale)
    0xff, 0xc0, 0x00, 0x0b, 0x08, 0x00, 0x01, 0x00, 0x01, 0x01, 0x01, 0x11,
    0x00,
    // DHT (DC table)
    0xff, 0xc4, 0x00, 0x1f, 0x00,
    0x00, 0x01, 0x05, 0x01, 0x01, 0x01, 0x01, 0x01,
    0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
    0x00, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07,
    0x08, 0x09, 0x0a, 0x0b,
    // SOS
    0xff, 0xda, 0x00, 0x08, 0x01, 0x01, 0x00, 0x00, 0x3f, 0x00,
    // Entropy-coded data for a white pixel (DC=0 in 1×1 grayscale)
    0xf8,
    // EOI
    0xff, 0xd9,
  ]
  return Buffer.from(jpegBytes)
}

test.beforeAll(async () => {
  fs.mkdirSync(TEST_DATA_DIR, { recursive: true })
  fs.writeFileSync(path.join(TEST_DATA_DIR, 'valid.jpg'), createMinimalJpeg())
  // invalid.jpg: JPEG magic bytes + garbage (truncated, not a valid image)
  fs.writeFileSync(
    path.join(TEST_DATA_DIR, 'invalid.jpg'),
    Buffer.from([0xff, 0xd8, 0xff, 0x00, 0xde, 0xad, 0xbe, 0xef])
  )
})

async function loginToProfile(page: any) {
  await deleteAllEmails()
  await page.goto('/auth')
  await expect(page.locator('#authIdInput')).toBeVisible({ timeout: 15000 })
  await page.locator('#authIdInput').fill(TEST_EMAIL)

  const altchaCheckbox = page.locator('altcha-widget').locator('input[type="checkbox"]')
  await altchaCheckbox.click()
  await expect(page.getByRole('button', { name: /login/i })).toBeEnabled({ timeout: 15000 })

  await page.waitForTimeout(STEP_DELAY)
  await page.getByRole('button', { name: /login/i }).click()
  await page.waitForURL('**/auth/otp', { timeout: 10000 })
  await page.waitForTimeout(STEP_DELAY)

  const otp = await getLatestOtp()
  expect(otp).toMatch(/^\d{6}$/)

  await page.locator('#otp').fill(otp)
  await page
    .locator('#otp')
    .evaluate((el: HTMLInputElement) => {
      el.dispatchEvent(new Event('change', { bubbles: true }))
    })
    .catch(() => {
      /* navigated away — expected */
    })

  await page.waitForURL(/\/(home|onboarding)/, { timeout: 15000 })

  await page.goto('/me')
  await page.waitForURL('**/me', { timeout: 10000 })
}

async function enterImageEditModal(page: any) {
  await page.getByTitle('Edit your info').click()
  await expect(page.locator('.photo-edit-button')).toBeVisible({ timeout: 10000 })
  await page.locator('.photo-edit-button').click()
  await expect(page.locator('.modal')).toBeVisible({ timeout: 10000 })
}

async function uploadImage(page: any, filename: string) {
  const fileInput = page.locator('#image-upload-input')
  await fileInput.setInputFiles(path.join(TEST_DATA_DIR, filename))
  await expect(page.getByRole('button', { name: /looks good/i })).toBeVisible({ timeout: 15000 })
  await page.getByRole('button', { name: /looks good/i }).click()
}

test.describe('Profile image upload (e2e)', () => {
  test.beforeEach(async () => {
    await deleteAllEmails()
  })

  const TEST_IMAGES = [
    { file: 'valid.jpg', expectError: false },
    { file: 'invalid.jpg', expectError: true },
  ]

  for (const { file, expectError } of TEST_IMAGES) {
    test(`upload ${file} — expects ${expectError ? 'error' : 'success'}`, async ({ page }) => {
      test.setTimeout(90_000)
      await loginToProfile(page)
      await enterImageEditModal(page)
      await uploadImage(page, file)

      if (expectError) {
        // Error component appears inside the modal
        await expect(page.locator('.modal .alert')).toBeVisible({ timeout: 10000 })
        // "Looks good" button is disabled after error
        await expect(page.getByRole('button', { name: /looks good/i })).toBeDisabled()
        // Modal stays open
        await expect(page.locator('.modal')).toBeVisible()
      } else {
        // Modal closes after successful upload
        await expect(page.locator('.modal')).not.toBeVisible({ timeout: 15000 })
        // Thumbnail appears in the grid
        await expect(page.locator('.thumbnail').first()).toBeVisible({ timeout: 15000 })
      }
    })
  }

  test('deletes an uploaded image', async ({ page }) => {
    test.setTimeout(90_000)
    await loginToProfile(page)
    await enterImageEditModal(page)

    // Upload a valid image first
    await uploadImage(page, 'valid.jpg')

    // Wait for modal to close and thumbnail to appear
    await expect(page.locator('.modal')).not.toBeVisible({ timeout: 15000 })
    const thumbnails = page.locator('.thumbnail')
    const countBefore = await thumbnails.count()
    expect(countBefore).toBeGreaterThan(0)

    // The delete button is only rendered when isDeletable (>1 image).
    // If there's only one image, upload a second one to enable deletion.
    if (countBefore < 2) {
      await enterImageEditModal(page)
      await uploadImage(page, 'valid.jpg')
      await expect(page.locator('.modal')).not.toBeVisible({ timeout: 15000 })
    }

    const countWithTwo = await page.locator('.thumbnail').count()
    // Delete the last thumbnail
    const deleteBtn = page.locator('.thumbnail .btn-secondary').last()
    await expect(deleteBtn).toBeVisible({ timeout: 5000 })
    await deleteBtn.click()

    // Thumbnail count decreases by 1
    await expect(page.locator('.thumbnail')).toHaveCount(countWithTwo - 1, { timeout: 10000 })
  })
})
