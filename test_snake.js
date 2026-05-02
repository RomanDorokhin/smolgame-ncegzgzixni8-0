const puppeteer = require('puppeteer');
const http = require('http');
const handler = require('serve-handler');

const server = http.createServer((request, response) => {
  return handler(request, response, { public: process.cwd() });
});

server.listen(8001, async () => {
  const browser = await puppeteer.launch({ args: ['--no-sandbox'] });
  const page = await browser.newPage();
  page.on('console', msg => console.log('BROWSER LOG:', msg.text()));
  page.on('pageerror', error => console.log('BROWSER ERROR:', error.message));
  
  await page.goto('http://127.0.0.1:8001/index.html');
  await page.click('#startBtn');
  
  // Set stage index to 1 (snake) and trigger morph so it starts snake
  await page.evaluate(() => {
    window.G = Object.values(window).find(v => v && v.gameMode !== undefined);
    if (!window.G) console.log("G not found globally");
    // If G is exported in a module, we might need to intercept it.
  });
  
  await new Promise(r => setTimeout(r, 2000));
  await browser.close();
  server.close();
  process.exit(0);
});
