const puppeteer = require('puppeteer');

(async () => {
  try {
    const browser = await puppeteer.launch({ headless: 'new' });
    const page = await browser.newPage();
    
    page.on('console', msg => console.log('BROWSER_LOG:', msg.text()));
    page.on('pageerror', error => console.log('BROWSER_ERROR:', error.message));
    page.on('requestfailed', request => console.log('BROWSER_REQ_FAIL:', request.url(), request.failure()?.errorText));

    await page.goto('http://localhost:4173', { waitUntil: 'networkidle0' });
    
    // Simulate login if on login page
    if (await page.$('input[placeholder="Enter your full name"]')) {
      await page.type('input[placeholder="Enter your full name"]', 'Test User');
      await page.type('input[placeholder="e.g. Computer Science"]', 'CS Dept');
      await page.click('button[type="submit"]');
      await page.waitForTimeout(2000);
    }
    
    // Click Continue Data Entry
    const clicked = await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const btn = btns.find(b => b.textContent.includes('Data Entry'));
      if (btn) {
        btn.click();
        return true;
      }
      return false;
    });
    
    if (clicked) {
      console.log('Clicking Data Entry button...');
      await new Promise(r => setTimeout(r, 2000));
    } else {
      console.log('Could not find Continue Data Entry button');
    }
    
    await browser.close();
  } catch (err) {
    console.error('SCRIPT_ERROR:', err);
  }
})();
