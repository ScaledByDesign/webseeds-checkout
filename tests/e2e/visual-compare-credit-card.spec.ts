import { test, expect } from '@playwright/test'

// Helper to clip screenshot to a specific element with robust waits/scrolling
async function screenshotElement(page, selector: string, fileName: string, opts: { waitForIframe?: boolean } = {}) {
  // Playwright selector engine allowed here (e.g., h3:has-text("Payment"))
  await page.waitForSelector(selector, { state: 'visible', timeout: 20000 })
  const el = page.locator(selector).first()
  await el.scrollIntoViewIfNeeded()
  await expect(el).toBeVisible({ timeout: 20000 })

  if (opts.waitForIframe) {
    const iframe = el.locator('iframe').first()
    await expect(iframe).toBeVisible({ timeout: 20000 })
  }

  await el.screenshot({ path: fileName })
}

// We run against two URLs:
// - The design HTML (static) under /design/checkout.html
// - Our live checkout page under /checkout
// Assumptions:
// - Next dev server serves public/ at /
// - Our credit card mount containers have #card-number-field, #card-expiry-field, #card-cvv-field

const DESIGN_URL = '/design/checkout.html'
const APP_URL = '/checkout'

// Selectors for the whole payment section and the three inputs in the design file
const DESIGN_SELECTORS = {
  paymentSection: 'h3:has-text("Payment")',
  cardNumber: '#cardNumber',
  expiry: '#expiry',
  cvv: '#cvv',
}

// Selectors for our page (CollectJS mount containers)
const APP_SELECTORS = {
  paymentSection: 'h3:has-text("Payment")',
  cardNumber: '#card-number-field',
  expiry: '#card-expiry-field',
  cvv: '#card-cvv-field',
}

// Desktop visual audit
test.describe('Credit Card UI visual comparison (desktop)', () => {
  test.use({ viewport: { width: 1280, height: 900 } })

  test('Design: capture payment section and inputs', async ({ page }) => {
    await page.goto(DESIGN_URL)
    await page.waitForTimeout(500)
    // Scroll a bit so the Payment section comes into view consistently
    await page.keyboard.press('PageDown')
    await page.waitForTimeout(200)

    await screenshotElement(page, DESIGN_SELECTORS.paymentSection, 'test-results/design-payment-section-desktop.png')
    await screenshotElement(page, DESIGN_SELECTORS.cardNumber, 'test-results/design-card-number-desktop.png')
    await screenshotElement(page, DESIGN_SELECTORS.expiry, 'test-results/design-expiry-desktop.png')
    await screenshotElement(page, DESIGN_SELECTORS.cvv, 'test-results/design-cvv-desktop.png')
  })

  test('App: capture payment section and fields', async ({ page }) => {
    await page.goto(APP_URL)
    await page.waitForLoadState('networkidle')

    // Scroll main content to ensure Payment section is in view
    await page.keyboard.press('PageDown')
    await page.waitForTimeout(300)

    await screenshotElement(page, APP_SELECTORS.paymentSection, 'test-results/app-payment-section-desktop.png')
    await screenshotElement(page, APP_SELECTORS.cardNumber, 'test-results/app-card-number-desktop.png', { waitForIframe: true })
    await screenshotElement(page, APP_SELECTORS.expiry, 'test-results/app-expiry-desktop.png', { waitForIframe: true })
    await screenshotElement(page, APP_SELECTORS.cvv, 'test-results/app-cvv-desktop.png', { waitForIframe: true })
  })
})

// Mobile visual audit
test.describe('Credit Card UI visual comparison (mobile)', () => {
  test.use({ viewport: { width: 390, height: 844 } })

  test('Design: capture payment section and inputs (mobile)', async ({ page }) => {
    await page.goto(DESIGN_URL)
    await page.waitForTimeout(500)

    await screenshotElement(page, DESIGN_SELECTORS.paymentSection, 'test-results/design-payment-section-mobile.png')
    await screenshotElement(page, DESIGN_SELECTORS.cardNumber, 'test-results/design-card-number-mobile.png')
    await screenshotElement(page, DESIGN_SELECTORS.expiry, 'test-results/design-expiry-mobile.png')
    await screenshotElement(page, DESIGN_SELECTORS.cvv, 'test-results/design-cvv-mobile.png')
  })

  test('App: capture payment section and fields (mobile)', async ({ page }) => {
    await page.goto(APP_URL)
    await page.waitForLoadState('networkidle')

    // Scroll to reveal payment area on mobile
    await page.evaluate(() => window.scrollBy(0, window.innerHeight / 2))
    await page.waitForTimeout(300)

    await screenshotElement(page, APP_SELECTORS.paymentSection, 'test-results/app-payment-section-mobile.png')
    await screenshotElement(page, APP_SELECTORS.cardNumber, 'test-results/app-card-number-mobile.png', { waitForIframe: true })
    await screenshotElement(page, APP_SELECTORS.expiry, 'test-results/app-expiry-mobile.png', { waitForIframe: true })
    await screenshotElement(page, APP_SELECTORS.cvv, 'test-results/app-cvv-mobile.png', { waitForIframe: true })
  })
})

