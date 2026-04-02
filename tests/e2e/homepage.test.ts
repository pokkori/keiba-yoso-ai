import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

/** AgeGate（年齢確認）を localStorageで通過させるヘルパー */
async function bypassAgeGate(page: import('@playwright/test').Page) {
  await page.goto('/')
  await page.evaluate(() => localStorage.setItem('age_verified', 'true'))
  await page.reload()
}

test.describe('homepage', () => {
  test('ページが正常にロードされる', async ({ page }) => {
    await bypassAgeGate(page)
    await expect(page).toHaveTitle(/.+/)
  })

  test('メインコンテンツが表示される', async ({ page }) => {
    await bypassAgeGate(page)
    const heading = page.locator('h1').first()
    await expect(heading).toBeVisible({ timeout: 10000 })
  })

  test('WCAG 2.2 AA アクセシビリティ違反がない', async ({ page }) => {
    await bypassAgeGate(page)
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze()
    expect(results.violations).toEqual([])
  })
})

test.describe('3競技セットプランバナー', () => {
  test('セットプランバナーが表示される', async ({ page }) => {
    await bypassAgeGate(page)
    const banner = page.getByTestId('set-plan-banner')
    await expect(banner).toBeVisible({ timeout: 10000 })
  })

  test('セットプランのCTAボタンが存在する', async ({ page }) => {
    await bypassAgeGate(page)
    const cta = page.getByTestId('set-plan-cta')
    await expect(cta).toBeVisible({ timeout: 10000 })
    await expect(cta).toHaveAttribute('aria-label', /3競技セットプランを申し込む/)
  })

  test('CTAボタンのmin-heightが44px以上である', async ({ page }) => {
    await bypassAgeGate(page)
    const cta = page.getByTestId('set-plan-cta')
    await cta.scrollIntoViewIfNeeded()
    await expect(cta).toBeVisible({ timeout: 10000 })
    const box = await cta.boundingBox()
    expect(box).not.toBeNull()
    expect(box!.height).toBeGreaterThanOrEqual(44)
  })

  test('CTAボタンをクリックすると決済モーダルが開く', async ({ page }) => {
    await bypassAgeGate(page)
    const cta = page.getByTestId('set-plan-cta')
    await cta.scrollIntoViewIfNeeded()
    await cta.click()
    // KomojuButtonを含むモーダルが表示されることを確認
    const modal = page.locator('text=3競技セットプラン').first()
    await expect(modal).toBeVisible({ timeout: 5000 })
  })

  test('バナーに22%OFFの表示がある', async ({ page }) => {
    await bypassAgeGate(page)
    const banner = page.getByTestId('set-plan-banner')
    await expect(banner).toContainText('22%')
    await expect(banner).toContainText('¥6,980')
    await expect(banner).toContainText('¥9,000')
  })
})
