import { defineConfig, devices } from '@playwright/test'

// Minimal config for running only the visual comparison spec against an already-running dev server
export default defineConfig({
  testDir: '.',
  testMatch: /tests\/e2e\/visual-compare-credit-card\.spec\.ts/,
  reporter: 'list',
  use: {
    baseURL: process.env.VISUAL_BASE_URL || 'http://localhost:3001',
    trace: 'retain-on-failure',
    screenshot: 'on',
    video: 'off',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
  // No webServer here; assume Next dev server is already running (we started it manually)
})

