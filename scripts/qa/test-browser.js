const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  await page.goto('http://localhost:3000/login');
  
  await page.fill('input[type="email"]', 'admin@example.com');
  await page.fill('input[type="password"]', 'password123');
  
  await page.click('button[type="submit"]');
  
  // Wait for navigation or a specific element that shows login success
  await page.waitForURL('http://localhost:3000/');
  
  console.log('Login successful, navigated to home!');
  
  // Verify cookie is set
  const cookies = await page.context().cookies();
  const tokenCookie = cookies.find(c => c.name === 'accessToken');
  if (tokenCookie) {
    console.log('Token cookie exists!');
  } else {
    console.log('No token cookie found!');
  }
  
  await browser.close();
})();
