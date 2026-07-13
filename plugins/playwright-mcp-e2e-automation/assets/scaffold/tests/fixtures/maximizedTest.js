const base = require('@playwright/test');

async function maximizarPaginaChromium(page, browserName = 'chromium') {
  if (browserName !== 'chromium') return;
  const sessao = await page.context().newCDPSession(page);
  try {
    const { windowId } = await sessao.send('Browser.getWindowForTarget');
    await sessao.send('Browser.setWindowBounds', {
      windowId,
      bounds: { windowState: 'maximized' },
    });
  } finally {
    await sessao.detach();
  }
}

const test = base.test.extend({
  page: async ({ page, browserName }, use, testInfo) => {
    if (testInfo.project.use.headless === false) {
      await maximizarPaginaChromium(page, browserName);
    }
    await use(page);
  },
});

module.exports = { expect: base.expect, test };
