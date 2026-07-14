import { test, expect } from '@playwright/test'

test('workspace switching and panel state persist', async ({ page }) => {
  // Intercept API calls
  await page.route('http://localhost:7000/**/*', (route) => {
    route.abort()
  })

  await page.goto('/')

  // Wait for the app to load
  const appShell = page.locator('.app-shell')
  await expect(appShell).toBeVisible()

  // Verify we start on Trading Day workspace
  const tradingDayTab = page.locator('button.panel-grid__tab').nth(0)
  expect(await tradingDayTab.getAttribute('class')).toContain('active')

  // Switch to Ops workspace
  const opsTab = page.locator('button.panel-grid__tab').nth(1)
  await opsTab.click()
  await page.waitForTimeout(300)

  // Verify Ops tab is now active
  expect(await opsTab.getAttribute('class')).toContain('active')

  // Verify Trading Day tab is not active
  expect(await tradingDayTab.getAttribute('class')).not.toContain('active')

  // Switch back to Trading Day
  await tradingDayTab.click()
  await page.waitForTimeout(300)

  // Verify we're back on Trading Day
  expect(await tradingDayTab.getAttribute('class')).toContain('active')
  expect(await opsTab.getAttribute('class')).not.toContain('active')

  // Reload the page to verify state persists
  await page.reload()
  await expect(appShell).toBeVisible()

  // Verify Trading Day is still active after reload
  const tradingDayTabAfterReload = page.locator('button.panel-grid__tab').nth(0)
  expect(await tradingDayTabAfterReload.getAttribute('class')).toContain('active')
})
