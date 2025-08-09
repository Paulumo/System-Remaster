const fs = require('fs');
const path = require('path');
const { pathToFileURL } = require('url');
const puppeteer = require('puppeteer');

(async () => {
  const projectRoot = path.resolve(__dirname, '..');
  const htmlPath = path.resolve(projectRoot, 'HOGE', 'hoge_chart.html');
  const fileUrl = pathToFileURL(htmlPath).href;

  const outDir = path.resolve(projectRoot, 'HOGE', 'result');
  const outFile = path.resolve(outDir, 'hoge-chart.pdf');

  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--allow-file-access-from-files']
  });
  try {
    const page = await browser.newPage();
    await page.goto(fileUrl, { waitUntil: 'load' });

    // Wait for rendering to complete (set by the HTML via plugin)
    await page.waitForFunction('window.renderDone === true', { timeout: 15000 });

    await page.pdf({
      path: outFile,
      width: '5.13in',
      height: '4.95in',
      printBackground: true,
      margin: { top: '0in', right: '0in', bottom: '0in', left: '0in' },
      pageRanges: '1'
    });

    console.log(`Saved: ${path.relative(projectRoot, outFile)}`);
  } finally {
    await browser.close();
  }
})();


