const puppeteer = require('puppeteer');
const http = require('http');
const handler = require('serve-handler');
const server = http.createServer((request, response) => {
  return handler(request, response, { public: process.cwd() });
});

server.listen(8000, async () => {
  const browser = await puppeteer.launch({ args: ['--no-sandbox'] });
  const page = await browser.newPage();
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', error => console.log('PAGE ERROR:', error.message));
  
  await page.goto('http://127.0.0.1:8000/index.html');
  await page.click('#startBtn');
  await new Promise(r => setTimeout(r, 1000));
  await browser.close();
  server.close();
  process.exit(0);
});
