const puppeteer = require('puppeteer');
const fs = require('fs');

(async () => {
  console.log("Launching browser...");
  const browser = await puppeteer.launch({ headless: "new", args: ['--no-sandbox'] });
  const page = await browser.newPage();
  
  try {
    console.log("Navigating to register page...");
    await page.goto('http://localhost:3000/register', { waitUntil: 'networkidle0' });
    
    console.log("Filling out registration form...");
    await page.type('input[type="email"]', 'final_agent_' + Date.now() + '@example.com');
    await page.type('input[type="password"]', 'Password123!');
    await page.type('input[id="confirmPassword"]', 'Password123!');
    
    // Click the LABEL instead of the checkbox to trigger trusted React event
    console.log("Accepting terms...");
    await page.click('label[for="acceptTerms"]');

    console.log("Submitting registration...");
    await page.click('button[type="submit"]');

    console.log("Waiting for verify page...");
    await page.waitForSelector('input[id="otp"]', { timeout: 10000 });

    console.log("Reached verify page. Reading OTP from backend...");
    await new Promise(r => setTimeout(r, 2000)); // wait a bit for backend to write OTP
    const otp = fs.readFileSync('/tmp/latest_otp.txt', 'utf8').trim();
    console.log("Read OTP:", otp);

    console.log("Filling OTP form...");
    await page.type('input[id="otp"]', otp);

    console.log("Submitting OTP...");
    await page.click('button[type="submit"]');

    console.log("Waiting for dashboard...");
    await page.waitForFunction("window.location.pathname.includes('/dashboard')", { timeout: 10000 });

    console.log("Current URL after verification:", page.url());
    if (page.url().includes('dashboard')) {
      console.log("SUCCESS! Reached dashboard.");
    } else {
      console.log("FAILED to reach dashboard. URL is", page.url());
    }

  } catch (error) {
    console.error("Error during E2E test:", error);
  } finally {
    await browser.close();
  }
})();
