/**
 * WebSight Wikipedia Test
 * Navigate to Wikipedia and get first 20 words of Badger article
 */

import { analyze, type, click, closeSession } from './dist/src/tools/session.js';
import { chromium } from 'playwright';

async function main() {
  console.log('🦡 Wikipedia Badger Challenge\n');
  
  try {
    // 1. Go directly to the Badger article
    console.log('1. Loading Badger article...');
    const { snapshot } = await analyze('https://en.wikipedia.org/wiki/Badger', 'out-wiki');
    
    // 2. Launch browser to get the text (reusing session would be better but this works)
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    await page.goto('https://en.wikipedia.org/wiki/Badger');
    
    // 3. Get first real paragraph
    const text = await page.evaluate(() => {
      const paragraphs = document.querySelectorAll('.mw-parser-output > p');
      for (const p of paragraphs) {
        const content = p.textContent?.trim();
        if (content && content.length > 50) {
          return content;
        }
      }
      return '';
    });
    
    await browser.close();
    
    if (text) {
      const words = text.split(/\s+/).slice(0, 20).join(' ');
      console.log('\n📖 First 20 words of Badger article:');
      console.log(`"${words}..."`);
    } else {
      console.log('❌ Could not find article text');
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  }
  
  await closeSession();
  console.log('\n✅ Done!');
}

main();
