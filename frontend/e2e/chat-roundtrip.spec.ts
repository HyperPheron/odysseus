import { test, expect } from '@playwright/test'

test('chat message roundtrip: user message and mocked assistant response appear', async ({
  page,
}) => {
  // Mock /api/sessions to return a session
  await page.route('http://localhost:7000/api/sessions', (route) => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([{ id: 's1', name: 'Main' }]),
    })
  })

  // Mock /api/chat to return a markdown response
  await page.route('http://localhost:7000/api/chat', (route) => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        response: 'This is a **bold** response from the assistant.',
      }),
    })
  })

  await page.goto('/')

  // Wait for the chat panel to load with the session
  const chatInput = page.locator('.chat-panel__input')
  await expect(chatInput).toBeVisible()

  // Type a message
  await chatInput.fill('Hello, assistant!')

  // Send the message (either by pressing Enter or clicking Send)
  await page.keyboard.press('Enter')

  // Wait for messages to appear
  const messages = page.locator('.chat-panel__message')

  // Verify user message appears
  const userMessage = messages.filter({ hasText: 'Hello, assistant!' })
  await expect(userMessage).toBeVisible()

  // Verify assistant message appears
  // Since ReactMarkdown renders **bold** as <strong>, look for the strong tag or the text
  const assistantMessages = page.locator('.chat-panel__message--assistant')
  await expect(assistantMessages).toBeVisible()

  // Check that either the markdown is rendered (has <strong> tag) or plain text appears
  const assistantContent = assistantMessages.first()
  const textContent = await assistantContent.textContent()
  expect(textContent).toContain('bold')
  expect(textContent).toContain('response from the assistant')

  // Verify the response was rendered as markdown (check for <strong> tag)
  const strongTag = assistantContent.locator('strong')
  const hasMarkdownRendered = await strongTag.count()
  expect(hasMarkdownRendered).toBeGreaterThan(0)
})

test.skip(
  'chat message roundtrip through real LiteLLM proxy (requires live backend)',
  async ({ page }) => {
    // This test requires a live LiteLLM proxy running on port 7000
    // Skip by default; run with --run-skipped flag or comment out .skip() for manual testing
    // with a real backend

    await page.route('http://localhost:7000/api/sessions', (route) => {
      route.abort() // Let real request through
    })

    await page.route('http://localhost:7000/api/chat', (route) => {
      route.abort() // Let real request through
    })

    await page.goto('/')

    const chatInput = page.locator('.chat-panel__input')
    await expect(chatInput).toBeVisible()

    await chatInput.fill('What is 2 + 2?')
    await page.keyboard.press('Enter')

    // Wait for assistant response with a longer timeout
    const assistantMessages = page.locator('.chat-panel__message--assistant')
    await expect(assistantMessages).toBeVisible({ timeout: 10000 })

    const response = await assistantMessages.first().textContent()
    expect(response).toBeTruthy()
  },
)
