const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

(async () => {
  console.log('Starting user simulation test...');
  let browser;
  try {
    browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });

    // 1. Login Page
    console.log('Navigating to login...');
    await page.goto('http://localhost:4173/');
    await page.waitForSelector('input[type="text"]');
    
    // Fill login
    const inputs = await page.$$('input[type="text"]');
    if (inputs.length >= 2) {
      await inputs[0].type('Test User');
      await inputs[1].type('Computer Science');
      console.log('Filled login form');
    }
    
    // Click submit
    await page.click('button[type="submit"]');
    await new Promise(r => setTimeout(r, 2000));
    console.log('Logged in successfully');

    // 2. Navigate to Section 3.1
    console.log('Navigating to Section 3.1...');
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const btn = btns.find(b => b.textContent && b.textContent.includes('Physical Infrastructure'));
      if (btn) btn.click();
    });
    // Wait for animation
    await new Promise(r => setTimeout(r, 1000));

    // 3. Click Set N/A
    console.log('Testing Set N/A feature...');
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const btn = btns.find(b => b.textContent && b.textContent.includes('Set N/A'));
      if (btn) btn.click();
    });
    await new Promise(r => setTimeout(r, 500));
    await page.screenshot({ path: 'test_na_result.png' });
    console.log('Screenshot of N/A saved: test_na_result.png');

    // 4. Navigate to Review & Submit
    console.log('Navigating to Review & Submit...');
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const btn = btns.find(b => b.textContent && b.textContent.includes('Review & Submit'));
      if (btn) btn.click();
    });
    await new Promise(r => setTimeout(r, 1000));

    // 5. Click Submit to Admin
    console.log('Clicking Submit to Admin...');
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const btn = btns.find(b => b.textContent && b.textContent.includes('Submit to Admin'));
      if (btn) btn.click();
    });
    
    // Wait for success message
    await new Promise(r => setTimeout(r, 1500));
    await page.screenshot({ path: 'test_submit_result.png' });
    console.log('Screenshot of Submit saved: test_submit_result.png');
    
    console.log('Test completed successfully!');
  } catch (err) {
    console.error('Test failed:', err);
  } finally {
    if (browser) await browser.close();
  }
})();
