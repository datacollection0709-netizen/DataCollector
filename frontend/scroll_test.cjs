const puppeteer = require('puppeteer');

(async () => {
  try {
    const browser = await puppeteer.launch({ headless: 'new' });
    const page = await browser.newPage();
    await page.setViewport({ width: 2560, height: 1170 });
    
    await page.goto('http://localhost:4173', { waitUntil: 'networkidle0' });
    
    // Check if on login page, and login
    if (await page.$('input[placeholder="John Doe"]')) {
      await page.type('input[placeholder="John Doe"]', 'Test User');
      await page.type('input[placeholder="Computer Science"]', 'CS Dept');
      await page.click('button[type="submit"]');
      await new Promise(r => setTimeout(r, 2000));
    }
    
    // Click on Section 3.1 to load a tall page
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const btn = btns.find(b => b.textContent && b.textContent.includes('Continue Data Entry'));
      if (btn) btn.click();
    });
    
    await new Promise(r => setTimeout(r, 1000));
    
    // Scroll down by 800px on the main container
    await page.evaluate(() => {
      const main = document.querySelector('main');
      if (main) {
        main.scrollBy(0, 800);
      }
    });
    
    await new Promise(r => setTimeout(r, 500));
    
    await page.screenshot({ path: 'scroll_test.png' });
    console.log('Screenshot saved to scroll_test.png');
    
    await browser.close();
  } catch (err) {
    console.error('SCRIPT_ERROR:', err);
  }
})();
