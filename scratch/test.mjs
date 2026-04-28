import puppeteer from 'puppeteer';

(async () => {
  try {
    console.log("Launching browser...");
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();
    
    page.on('console', msg => console.log('BROWSER LOG:', msg.text()));
    page.on('pageerror', err => console.log('BROWSER ERROR:', err.message));
    
    console.log("Navigating to setup localStorage...");
    await page.goto('http://localhost:8080/');
    
    await page.evaluate(() => {
      localStorage.setItem('access_token', 'mock_token');
      localStorage.setItem('exercise_1_history', JSON.stringify({
        map: {
          "0.10": {
            t: 0.1,
            points: Array(33).fill([0.5, 0.5, 0, 1]),
            angles: { "LEFT_SHOULDER": 90 }
          }
        },
        segments: [1]
      }));
    });
    
    console.log("Navigating to 3D Viewer...");
    await page.goto('http://localhost:8080/exercises/1/3d-viewer', { waitUntil: 'networkidle0' });
    
    await new Promise(r => setTimeout(r, 2000));
    console.log("Done.");
    await browser.close();
  } catch (err) {
    console.error("SCRIPT ERROR:", err);
  }
})();
