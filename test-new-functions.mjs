/**
 * Test new WebSight functions: goto, getText, evaluate, count, waitForNavigation
 */
import { goto, getText, evaluate, count, waitForNavigation, type, click, closeSession } from './dist/src/tools/session.js';

async function test() {
  console.log('🧪 Testing new WebSight functions\n');

  // Test 1: goto() - fast navigation
  console.log('1️⃣ Testing goto()...');
  const nav = await goto('https://en.wikipedia.org/wiki/Badger');
  console.log(`   ${nav.success ? '✅' : '❌'} ${nav.message} (${nav.durationMs}ms)\n`);

  // Test 2: count() - count elements
  console.log('2️⃣ Testing count()...');
  const paragraphs = await count('p');
  console.log(`   ${paragraphs.success ? '✅' : '❌'} ${paragraphs.message} (${paragraphs.durationMs}ms)\n`);

  // Test 3: getText() - first non-empty paragraph (skip donation banner)
  console.log('3️⃣ Testing getText() - first content paragraph...');
  const firstP = await getText('#mw-content-text p', undefined, { minLength: 50 });
  if (firstP.success && firstP.text) {
    const preview = firstP.text.substring(0, 100) + '...';
    console.log(`   ✅ Got text (${firstP.text.length} chars): "${preview}" (${firstP.durationMs}ms)\n`);
  } else {
    console.log(`   ❌ ${firstP.message}\n`);
  }

  // Test 4: getText() with all=true
  console.log('4️⃣ Testing getText({ all: true })...');
  const allH2 = await getText('h2', undefined, { all: true });
  if (allH2.success && allH2.texts) {
    console.log(`   ✅ Got ${allH2.texts.length} headings: ${allH2.texts.slice(0, 5).join(', ')}... (${allH2.durationMs}ms)\n`);
  } else {
    console.log(`   ❌ ${allH2.message}\n`);
  }

  // Test 5: evaluate() - custom JS
  console.log('5️⃣ Testing evaluate() - custom JS...');
  const title = await evaluate(() => document.title);
  console.log(`   ${title.success ? '✅' : '❌'} Page title: "${title.result}" (${title.durationMs}ms)\n`);

  // Test 6: evaluate() with complex extraction
  console.log('6️⃣ Testing evaluate() - extract article summary...');
  const summary = await evaluate(() => {
    const ps = Array.from(document.querySelectorAll('#mw-content-text p'));
    for (const p of ps) {
      const text = p.textContent?.trim();
      if (text && text.length > 100 && !text.startsWith('Coordinates')) {
        return text.split(' ').slice(0, 25).join(' ') + '...';
      }
    }
    return null;
  });
  console.log(`   ${summary.success ? '✅' : '❌'} Summary: "${summary.result}" (${summary.durationMs}ms)\n`);

  // Test 7: Navigation workflow - search for something
  console.log('7️⃣ Testing search navigation workflow...');
  await goto('https://en.wikipedia.org');
  await type('input[name="search"]', 'Red panda');
  await click('button[type="submit"]');
  await waitForNavigation();
  const newTitle = await evaluate(() => document.title);
  console.log(`   ${newTitle.success ? '✅' : '❌'} Navigated to: "${newTitle.result}"\n`);

  // Clean up
  await closeSession();
  console.log('✨ All tests complete!');
}

test().catch(console.error);
