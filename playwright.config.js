const { defineConfig } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './tests',
  timeout: 30_000,
  use: {
    baseURL: 'http://127.0.0.1:4177'
  },
  webServer: {
    command: 'python -m http.server 4177',
    url: 'http://127.0.0.1:4177',
    reuseExistingServer: true,
    timeout: 10_000
  }
});
