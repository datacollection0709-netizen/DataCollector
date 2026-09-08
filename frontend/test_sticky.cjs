const puppeteer = require('puppeteer');
const path = require('path');

(async () => {
  try {
    const browser = await puppeteer.launch({ headless: 'new' });
    const page = await browser.newPage();
    await page.setViewport({ width: 1200, height: 800 });
    
    await page.goto('file://' + path.resolve('test_sticky.html'));
    
    // Scroll down by 500px
    await page.evaluate(() => {
      window.scrollBy(0, 500);
    });
    
    await new Promise(r => setTimeout(r, 500));
    
    await page.screenshot({ path: 'sticky_test.png' });
    console.log('Screenshot saved to sticky_test.png');
    
    await browser.close();
  } catch (err) {
    console.error('SCRIPT_ERROR:', err);
  }
})();
