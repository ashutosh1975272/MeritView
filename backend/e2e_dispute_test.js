const puppeteer = require('puppeteer');
const fs = require('fs');

(async () => {
  console.log("Launching browser...");
  const browser = await puppeteer.launch({ headless: "new", args: ['--no-sandbox'] });
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('response', async response => {
    if (response.url().includes('/disputes') && response.request().method() === 'POST') {
      console.log('API POST /disputes returned status:', response.status());
    }
  });

  try {
    console.log("Navigating to register page...");
    await page.goto('http://localhost:3000/register', { waitUntil: 'networkidle0' });
    
    await page.type('input[type="email"]', 'dispute_agent_3_' + Date.now() + '@example.com');
    await page.type('input[type="password"]', 'Password123!');
    await page.type('input[id="confirmPassword"]', 'Password123!');
    await page.click('label[for="acceptTerms"]');

    await page.click('button[type="submit"]');

    await page.waitForSelector('input[id="otp"]', { timeout: 10000 });

    await new Promise(r => setTimeout(r, 2000));
    const otp = fs.readFileSync('/tmp/latest_otp.txt', 'utf8').trim();
    
    await page.type('input[id="otp"]', otp);
    await page.click('button[type="submit"]');

    await page.waitForFunction("window.location.pathname.includes('/dashboard')", { timeout: 10000 });

    console.log("Navigating to Dispute Creation...");
    await page.goto('http://localhost:3000/dashboard/disputes/new', { waitUntil: 'networkidle0' });
    
    await page.type('input[id="title"]', 'Automated Dispute Title via Puppeteer');
    await page.type('textarea[id="summary"]', 'Automated dispute summary.');
    await page.type('input[id="stakes"]', '5000');

    await page.click('button[type="submit"]');
    
    console.log("Waiting for redirection...");
    // Wait for the URL to NOT end in 'new'
    await page.waitForFunction("!window.location.pathname.endsWith('new')", { timeout: 10000 });
    
    console.log("Current URL after dispute creation:", page.url());
    console.log("SUCCESS! Dispute created and redirected to details view.");

  } catch (error) {
    console.error("Error during E2E test:", error);
  } finally {
    await browser.close();
  }
})();
