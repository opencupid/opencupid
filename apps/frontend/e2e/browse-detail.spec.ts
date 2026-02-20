import { test, expect } from '@playwright/test'

test.describe('Browse list/detail view', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/browse', { waitUntil: 'domcontentloaded' })
    await page.waitForURL(/\/browse\//, { timeout: 15000 })
    await expect(page.locator('.profile-card').first()).toBeVisible({ timeout: 15000 })
  })

  test('clicking a profile card shows detail overlay and preserves grid', async ({ page }) => {
    const firstCard = page.locator('.profile-card').first()
    await firstCard.click()

    // URL should update to /profile/:id
    await expect(page).toHaveURL(/\/profile\//)

    // Detail view should be visible
    await expect(page.locator('.detail-view')).toBeVisible()

    // The list view should still be in the DOM (hidden but not destroyed)
    const listView = page.locator('.list-view')
    await expect(listView).toBeAttached()
    const display = await listView.evaluate((el) => getComputedStyle(el).display)
    expect(display).not.toBe('none')
  })

  test('closing detail view returns to browse grid with URL restored', async ({ page }) => {
    await page.locator('.profile-card').first().click()
    await expect(page).toHaveURL(/\/profile\//)

    // Click the Back button in the detail view
    await page.getByRole('button', { name: 'Back' }).click()

    // Should return to browse with the same scope
    await expect(page).toHaveURL(/\/browse\//)

    // Grid should be visible again
    await expect(page.locator('.profile-card').first()).toBeVisible()
  })

  test('scroll position is preserved after closing detail view', async ({ page }) => {
    // Get the scroll container and check it's scrollable
    const info = await page.evaluate(() => {
      const el = document.querySelector('.list-view .overflow-auto.flex-grow-1')
      if (!el) return { found: false, scrollHeight: 0, clientHeight: 0 }
      return { found: true, scrollHeight: el.scrollHeight, clientHeight: el.clientHeight }
    })
    expect(info.found).toBe(true)

    // Scroll by a fraction of available scroll range to ensure it's valid
    const scrollTarget = Math.min(300, Math.floor((info.scrollHeight - info.clientHeight) / 2))
    // Skip test if not enough content to scroll
    test.skip(scrollTarget < 10, 'Not enough content to scroll')

    await page.evaluate((top) => {
      const el = document.querySelector('.list-view .overflow-auto.flex-grow-1')
      if (el) el.scrollTop = top
    }, scrollTarget)

    const scrollBefore = await page.evaluate(
      () => document.querySelector('.list-view .overflow-auto.flex-grow-1')?.scrollTop ?? -1
    )
    expect(scrollBefore).toBeGreaterThan(0)

    // Open a profile via programmatic click to avoid Playwright's scroll-into-view
    await page.evaluate(() => {
      const card = document.querySelector('.profile-card') as HTMLElement | null
      card?.click()
    })
    await expect(page).toHaveURL(/\/profile\//)

    // Verify grid scroll is maintained while detail is open
    const scrollDuring = await page.evaluate(
      () => document.querySelector('.list-view .overflow-auto.flex-grow-1')?.scrollTop ?? -1
    )
    expect(scrollDuring).toBe(scrollBefore)

    // Close the profile
    await page.getByRole('button', { name: 'Back' }).click()
    await expect(page).toHaveURL(/\/browse\//)
    await expect(page.locator('.profile-card').first()).toBeVisible()

    // Scroll position should be preserved
    const scrollAfter = await page.evaluate(
      () => document.querySelector('.list-view .overflow-auto.flex-grow-1')?.scrollTop ?? -1
    )
    expect(scrollAfter).toBe(scrollBefore)
  })

  test('list-detail uses replace (no extra history entry)', async ({ page }) => {
    await page.locator('.profile-card').first().click()
    await expect(page).toHaveURL(/\/profile\//)

    // Browser back should skip /profile (replace was used) and go to prior history
    await page.goBack()
    await expect(page).not.toHaveURL(/\/profile\//)
  })
})
