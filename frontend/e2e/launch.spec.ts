import { test, expect } from '@playwright/test'

test('app launches with three panel titles and workspace tabs visible', async ({ page }) => {
  // Intercept API calls to prevent network errors
  await page.route('http://localhost:7000/**/*', (route) => {
    route.abort()
  })

  // Listen for console errors (excluding network errors)
  const errors: string[] = []
  page.on('console', (msg) => {
    if (msg.type() === 'error' && !msg.text().includes('Failed to load resource')) {
      errors.push(msg.text())
    }
  })

  await page.goto('/')

  // Check that the app shell loads
  const appShell = page.locator('.app-shell')
  await expect(appShell).toBeVisible()

  // Check that all three workspace tabs are visible
  const workspaceTabs = page.locator('button.panel-grid__tab')
  await expect(workspaceTabs).toHaveCount(3)
  await expect(workspaceTabs.nth(0)).toContainText('Trading Day')
  await expect(workspaceTabs.nth(1)).toContainText('Ops')
  await expect(workspaceTabs.nth(2)).toContainText('Comms')

  // Check that the three panel titles are visible (Chat, Calendar, Email)
  const panelTitles = page.locator('.panel-shell__title')
  await expect(panelTitles).toHaveCount(3)

  const titles = await panelTitles.allTextContents()
  expect(titles.sort()).toEqual(['Calendar', 'Chat', 'Email'].sort())

  // Verify no console errors (excluding network errors)
  expect(errors).toHaveLength(0)
})
