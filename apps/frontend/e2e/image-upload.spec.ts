import { test, expect } from '@playwright/test'
import * as path from 'path'

const TEST_DATA_DIR = path.join(import.meta.dirname, 'test-data')
const MAX_IMAGES = 6

// The field-edit-modal opens when editing profile images.
const fieldEditModal = (page: any) => page.locator('.modal.field-edit-modal.show')

// The photo preview modal ("Add a photo") opens after selecting a file.
const photoPreviewModal = (page: any) => page.getByRole('dialog', { name: 'Add a photo' })

async function enterImageEditModal(page: any) {
  await page.getByRole('button', { name: 'Edit your info' }).click()
  await expect(page.locator('.photo-edit-button')).toBeVisible({ timeout: 10000 })
  await page.locator('.photo-edit-button').click()
  await expect(fieldEditModal(page)).toBeVisible({ timeout: 10000 })
}

async function ensureUploadSlotAvailable(page: any) {
  const thumbnails = fieldEditModal(page).locator('.thumbnail')
  const count = await thumbnails.count()
  if (count >= MAX_IMAGES) {
    // Delete the last image to make room for upload
    const deleteBtn = thumbnails.last().locator('.btn-secondary')
    await deleteBtn.click()
    await expect(thumbnails).toHaveCount(count - 1, { timeout: 10000 })
  }
}

async function uploadImage(page: any, filename: string) {
  await ensureUploadSlotAvailable(page)
  const fileInput = page.locator('#image-upload-input').first()
  await fileInput.setInputFiles(path.join(TEST_DATA_DIR, filename))
  await expect(page.getByRole('button', { name: /looks good/i })).toBeVisible({ timeout: 15000 })
  await page.getByRole('button', { name: /looks good/i }).click()
}

test.describe('Profile image upload (e2e)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/me')
    await page.waitForURL('**/me', { timeout: 10000 })
  })

  test('upload valid image succeeds', async ({ page }) => {
    test.setTimeout(30_000)
    await enterImageEditModal(page)
    await uploadImage(page, 'valid.jpg')

    const previewModal = photoPreviewModal(page)
    await expect(previewModal).not.toBeVisible({ timeout: 15000 })
    await expect(fieldEditModal(page).locator('.thumbnail').first()).toBeVisible({ timeout: 10000 })
  })

  test('upload invalid image shows error', async ({ page }) => {
    test.setTimeout(30_000)
    await enterImageEditModal(page)
    await uploadImage(page, 'invalid.txt')

    const previewModal = photoPreviewModal(page)
    await expect(previewModal.locator('.alert')).toBeVisible({ timeout: 10000 })
    await expect(previewModal).toBeVisible()
  })

  test('deletes an uploaded image', async ({ page }) => {
    test.setTimeout(30_000)
    await enterImageEditModal(page)

    const thumbnails = fieldEditModal(page).locator('.thumbnail')
    const countBefore = await thumbnails.count()
    expect(countBefore).toBeGreaterThan(1)

    // Delete the last thumbnail
    const deleteBtn = thumbnails.last().locator('.btn-secondary')
    await expect(deleteBtn).toBeVisible({ timeout: 5000 })
    await deleteBtn.click()

    await expect(thumbnails).toHaveCount(countBefore - 1, { timeout: 10000 })
  })
})
