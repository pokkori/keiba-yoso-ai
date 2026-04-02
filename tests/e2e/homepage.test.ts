import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

test.describe('homepage', () => {
  test('ページが正常にロードされる', async ({ page }) => {
    await page.goto('/')
    await expect(page).toHaveTitle(/.+/)
  })

  test('メインコンテンツが表示される', async ({ page }) => {
    await page.goto('/')
    const heading = page.locator('h1').first()
    await expect(heading).toBeVisible({ timeout: 10000 })
  })

  test('WCAG 2.2 AA アクセシビリティ違反がない', async ({ page }) => {
    await page.goto('/')
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze()
    expect(results.violations).toEqual([])
  })
})
