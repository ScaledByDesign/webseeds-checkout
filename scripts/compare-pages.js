const { chromium } = require('playwright');

async function comparePages() {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  
  // Create two pages
  const designPage = await context.newPage();
  const appPage = await context.newPage();
  
  try {
    // Navigate to both pages
    console.log('Loading design page...');
    await designPage.goto('file:///Users/nova/Sites/webseeds-checkout/public/design/checkout.html');
    
    console.log('Loading app page...');
    await appPage.goto('http://localhost:3000/checkout');
    
    // Wait for pages to load
    await designPage.waitForLoadState('networkidle');
    await appPage.waitForLoadState('networkidle');
    
    // Set viewport sizes for comparison
    const viewports = [
      { name: 'mobile', width: 375, height: 812 },
      { name: 'tablet', width: 768, height: 1024 },
      { name: 'desktop', width: 1280, height: 800 }
    ];
    
    for (const viewport of viewports) {
      console.log(`Taking screenshots at ${viewport.name} (${viewport.width}x${viewport.height})`);
      
      // Set viewport
      await designPage.setViewportSize({ width: viewport.width, height: viewport.height });
      await appPage.setViewportSize({ width: viewport.width, height: viewport.height });
      
      // Take screenshots
      await designPage.screenshot({ 
        path: `screenshots/design-${viewport.name}.png`, 
        fullPage: true 
      });
      await appPage.screenshot({ 
        path: `screenshots/app-${viewport.name}.png`, 
        fullPage: true 
      });
      
      // Focus on security icons section
      try {
        const securityContainer = await appPage.locator('div:has(img[alt*="McAfee"])').first();
        const designSecurityContainer = await designPage.locator('div:has(img[alt*="McAfee"])').first();

        if (await securityContainer.isVisible()) {
          await securityContainer.scrollIntoViewIfNeeded();
          await designSecurityContainer.scrollIntoViewIfNeeded();

          const appBox = await securityContainer.boundingBox();
          const designBox = await designSecurityContainer.boundingBox();

          if (appBox && designBox) {
            await appPage.screenshot({
              path: `screenshots/app-security-${viewport.name}.png`,
              clip: { x: appBox.x - 20, y: appBox.y - 20, width: appBox.width + 40, height: appBox.height + 40 }
            });
            await designPage.screenshot({
              path: `screenshots/design-security-${viewport.name}.png`,
              clip: { x: designBox.x - 20, y: designBox.y - 20, width: designBox.width + 40, height: designBox.height + 40 }
            });
          }
        }
      } catch (e) {
        console.log(`Could not capture security section for ${viewport.name}: ${e.message}`);
      }
    }
    
    // Focus on phone field specifically
    console.log('Taking phone field screenshots...');
    await designPage.setViewportSize({ width: 1280, height: 800 });
    await appPage.setViewportSize({ width: 1280, height: 800 });

    try {
      const phoneField = await appPage.locator('#phone').first();
      const designPhoneField = await designPage.locator('#phone').first();

      if (await phoneField.isVisible()) {
        await phoneField.scrollIntoViewIfNeeded();
        await designPhoneField.scrollIntoViewIfNeeded();

        // Take screenshots of the phone field area
        const phoneContainer = await appPage.locator('.floating-label-group:has(#phone)').first();
        const designPhoneContainer = await designPage.locator('.floating-label-group:has(#phone)').first();

        const appBox = await phoneContainer.boundingBox();
        const designBox = await designPhoneContainer.boundingBox();

        if (appBox && designBox) {
          await appPage.screenshot({
            path: `screenshots/app-phone-field.png`,
            clip: { x: appBox.x - 20, y: appBox.y - 20, width: appBox.width + 40, height: appBox.height + 40 }
          });
          await designPage.screenshot({
            path: `screenshots/design-phone-field.png`,
            clip: { x: designBox.x - 20, y: designBox.y - 20, width: designBox.width + 40, height: designBox.height + 40 }
          });
        }
      }
    } catch (e) {
      console.log(`Could not capture phone field: ${e.message}`);
    }

    // Compare the OR divider alignment
    console.log('Measuring OR divider alignment...');
    try {
      const findOrMetrics = async (page) => {
        const span = await page.locator('span:text("OR")').first();
        await span.scrollIntoViewIfNeeded();
        const spanBox = await span.boundingBox();
        // find closest ancestor with border-b-3 class
        const containerHandle = await span.evaluateHandle((el) => {
          let p = el.parentElement;
          while (p) {
            if (p.className && p.className.includes('border-b-3')) return p;
            p = p.parentElement;
          }
          return el.parentElement;
        });
        const container = page.locator('xpath=.', { has: span });
        const containerBox = await containerHandle.asElement().boundingBox();
        if (!spanBox || !containerBox) return null;
        const containerCenterX = containerBox.x + containerBox.width / 2;
        const spanCenterX = spanBox.x + spanBox.width / 2;
        const offset = Math.round(spanCenterX - containerCenterX);
        return { spanBox, containerBox, offset };
      };

      const designOr = await findOrMetrics(designPage);
      const appOr = await findOrMetrics(appPage);
      if (designOr && appOr) {
        console.log(`Design OR center offset: ${designOr.offset}px (should be ~0)`);
        console.log(`App OR center offset: ${appOr.offset}px (should be ~0)`);
        await appPage.screenshot({ path: 'screenshots/app-or.png', clip: { x: appOr.containerBox.x, y: appOr.containerBox.y, width: appOr.containerBox.width, height: Math.min(appOr.containerBox.height + 40, 300) } });
        await designPage.screenshot({ path: 'screenshots/design-or.png', clip: { x: designOr.containerBox.x, y: designOr.containerBox.y, width: designOr.containerBox.width, height: Math.min(designOr.containerBox.height + 40, 300) } });
      } else {
        console.log('Could not compute OR metrics');
      }
    } catch (e) {
      console.log('OR measurement error:', e.message);
    }

    console.log('Screenshots saved to screenshots/ directory');
    console.log('You can now compare the images side by side');

    // Keep browser open for manual inspection
    console.log('Browser will stay open for manual comparison...');
    console.log('Press Ctrl+C to close when done');
    
    // Position windows side by side
    await designPage.bringToFront();
    await appPage.bringToFront();
    
    // Wait for user to close
    await new Promise(() => {});
    
  } catch (error) {
    console.error('Error during comparison:', error);
  } finally {
    await browser.close();
  }
}

// Create screenshots directory
const fs = require('fs');
if (!fs.existsSync('screenshots')) {
  fs.mkdirSync('screenshots');
}

comparePages().catch(console.error);
