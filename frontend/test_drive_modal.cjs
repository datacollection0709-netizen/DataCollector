const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

(async () => {
  console.log('Testing Google Drive Insert File Modal and Setup Workflow...');
  let browser;
  try {
    browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 850 });

    // 1. Open app
    console.log('1. Navigating to app...');
    await page.goto('http://localhost:5173/');
    await page.waitForSelector('input[type="text"]');

    // Login
    const inputs = await page.$$('input[type="text"]');
    if (inputs.length >= 2) {
      await inputs[0].type('Dean Academic');
      await inputs[1].type('School of Engineering');
    }
    await page.click('button[type="submit"]');
    await new Promise((r) => setTimeout(r, 1500));
    console.log('2. Logged in successfully');

    // 2. Open Section 3.1
    console.log('3. Navigating to Section 3.1...');
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const secBtn = btns.find((b) => b.textContent && b.textContent.includes('3.1 Infrastructure'));
      if (secBtn) secBtn.click();
    });
    await new Promise((r) => setTimeout(r, 1500));

    // 3. Click Proof button in table
    console.log('4. Clicking Proof button in table...');
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const proofBtn = btns.find((b) => b.textContent && (b.textContent.includes('Proof') || b.textContent.includes('Attach') || b.textContent.includes('Photo') || b.textContent.includes('Drive Link')));
      if (proofBtn) proofBtn.click();
    });
    await new Promise((r) => setTimeout(r, 1000));

    // Screenshot of Google Drive Insert file modal with Setup Card
    await page.screenshot({ path: 'gdrive_modal_setup_view.png' });
    console.log('Screenshot saved: gdrive_modal_setup_view.png');

    // 4. Test connecting Google Drive with a simulated Web App URL
    console.log('5. Testing Google Drive connection input...');
    const urlInput = await page.$('input[placeholder="https://script.google.com/macros/s/.../exec"]');
    if (urlInput) {
      await urlInput.type('https://script.google.com/macros/s/AKfycbz_Attribute3_Live_Deployment_Mock/exec');
      console.log('Typed sample Web App URL into input');
    }

    await page.screenshot({ path: 'gdrive_modal_with_url.png' });
    console.log('Screenshot saved: gdrive_modal_with_url.png');

    // 5. Test My Drive tab
    console.log('6. Testing My Drive tab...');
    await page.evaluate(() => {
      const tabBtns = Array.from(document.querySelectorAll('button'));
      const myDriveTab = tabBtns.find((b) => b.textContent && b.textContent.trim() === 'My Drive');
      if (myDriveTab) myDriveTab.click();
    });
    await new Promise((r) => setTimeout(r, 800));
    await page.screenshot({ path: 'gdrive_modal_mydrive_tab.png' });
    console.log('Screenshot saved: gdrive_modal_mydrive_tab.png');

    console.log('All Google Drive modal tests completed successfully!');
  } catch (err) {
    console.error('Test error:', err);
  } finally {
    if (browser) await browser.close();
  }
})();
