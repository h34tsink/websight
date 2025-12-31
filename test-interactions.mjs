/**
 * WebSight Interaction Test Script
 * Tests all interaction capabilities rapidly
 */

import { 
  analyze, 
  click, 
  type as typeText, 
  select, 
  hover, 
  scroll, 
  press,
  closeSession 
} from './dist/src/tools/session.js';

const URL = 'http://localhost:5173/';
const results = [];

async function log(action, result) {
  const status = result.success ? '✅' : '❌';
  const time = result.durationMs ? `(${result.durationMs}ms)` : '';
  console.log(`${status} ${action}: ${result.message} ${time}`);
  results.push({ action, ...result });
}

async function runTests() {
  console.log('🚀 WebSight Interaction Test - Starting...\n');
  console.log('=' .repeat(60));
  
  try {
    // Initial look
    console.log('\n📸 INITIAL ANALYSIS');
    const { report } = await analyze(URL, 'out');
    console.log('Page loaded and analyzed\n');

    // === TYPING IN FORM FIELDS ===
    console.log('⌨️  TYPING TESTS');
    await log('type name', await typeText('field-name', 'John Doe', URL));
    await log('type email', await typeText('field-email', 'john@example.com', URL));
    await log('type phone', await typeText('field-phone', '555-123-4567', URL));
    await log('type website', await typeText('field-website', 'https://websight.dev', URL));
    await log('type message', await typeText('field-message', 'Testing WebSight interactions! This is a multi-line message to test the textarea input.', URL));
    await log('type search', await typeText('search-input', 'WebSight test query', URL));
    await log('type password', await typeText('field-password', 'SecureP@ss123', URL));
    await log('type search field', await typeText('field-search', 'searching...', URL));

    // === DROPDOWN SELECTIONS ===
    console.log('\n📋 SELECT TESTS');
    await log('select topic', await select('field-topic', 'automation', URL));  // value="automation"
    await log('select priority', await select('field-priority', 'high', URL));    // value="high"
    await log('select country', await select('field-country', 'ca', URL));        // value="ca"
    await log('select timezone', await select('field-timezone', 'pst', URL));     // value="pst"

    // === BUTTON CLICKS ===
    console.log('\n🖱️  CLICK TESTS');
    await log('click primary action', await click('btn-primary-action', URL));
    await log('click save', await click('btn-save', URL));
    await log('click card 1', await click('card-1-btn', URL));
    await log('click card 2', await click('card-2-btn', URL));
    await log('click card 3', await click('card-3-btn', URL));
    await log('click sidebar run', await click('sidebar-run', URL));
    await log('click sidebar refresh', await click('sidebar-refresh', URL));

    // === TOGGLE SWITCHES ===
    console.log('\n🔘 TOGGLE TESTS');
    await log('toggle dark mode', await click('toggle-dark-mode', URL));
    await log('toggle notifications', await click('toggle-notifications', URL));
    await log('toggle auto-save', await click('toggle-auto-save', URL));

    // === COUNTER ===
    console.log('\n🔢 COUNTER TESTS');
    await log('counter +', await click('counter-increment', URL));
    await log('counter +', await click('counter-increment', URL));
    await log('counter +', await click('counter-increment', URL));
    await log('counter -', await click('counter-decrement', URL));

    // === TABS ===
    console.log('\n📑 TAB TESTS');
    await log('tab details', await click('tab-details', URL));
    await log('tab history', await click('tab-history', URL));
    await log('tab overview', await click('tab-overview', URL));

    // === ACCORDION ===
    console.log('\n🪗 ACCORDION TESTS');
    await log('accordion 1', await click('accordion-1', URL));
    await log('accordion 2', await click('accordion-2', URL));
    await log('accordion 3', await click('accordion-3', URL));

    // === CHECKBOXES ===
    console.log('\n☑️  CHECKBOX TESTS');
    await log('check email notify', await click('check-email-notifications', URL));
    await log('check sms notify', await click('check-sms-notifications', URL));
    await log('check push notify', await click('check-push-notifications', URL));
    await log('check newsletter', await click('check-newsletter', URL));

    // === RADIO BUTTONS ===
    console.log('\n🔘 RADIO TESTS');
    await log('radio phone', await click('radio-contact-phone', URL));
    await log('radio chat', await click('radio-contact-chat', URL));
    await log('radio email', await click('radio-contact-email', URL));

    // === HOVER ===
    console.log('\n👆 HOVER TESTS');
    await log('hover card', await hover('hover-card', URL));
    await log('hover button', await hover('hover-button', URL));

    // === NAVIGATION ===
    console.log('\n🔗 NAVIGATION TESTS');
    await log('nav overview', await click('nav-overview', URL));
    await log('nav actions', await click('nav-actions', URL));
    await log('nav form', await click('nav-form', URL));
    await log('nav table', await click('nav-table', URL));

    // === SCROLL ===
    console.log('\n📜 SCROLL TESTS');
    await log('scroll down', await scroll('down', URL));
    await log('scroll down', await scroll('down', URL));
    await log('scroll bottom', await scroll('bottom', URL));
    await log('scroll top', await scroll('top', URL));

    // === MODAL ===
    console.log('\n🪟 MODAL TESTS');
    await log('open modal', await click('btn-open-modal', URL));
    await log('type modal search', await typeText('modal-search', 'Modal search test', URL));
    await log('select modal choice', await select('modal-choice', 'Beta', URL));
    await log('close modal', await click('btn-close-modal', URL));  // Click close button instead of Escape

    // === TOAST ===
    console.log('\n🍞 TOAST TEST');
    await log('show toast', await click('btn-toast', URL));

    // === KEYBOARD ===
    console.log('\n⌨️  KEYBOARD TESTS');
    await log('press tab', await press('Tab', URL));
    await log('press tab', await press('Tab', URL));
    await log('press enter', await press('Enter', URL));

    // === SUMMARY ===
    console.log('\n' + '='.repeat(60));
    console.log('📊 TEST SUMMARY');
    console.log('='.repeat(60));
    
    const passed = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;
    const totalTime = results.reduce((sum, r) => sum + (r.durationMs || 0), 0);
    
    console.log(`✅ Passed: ${passed}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`⏱️  Total time: ${totalTime}ms`);
    console.log(`📈 Average: ${Math.round(totalTime / results.length)}ms per action`);
    
    if (failed > 0) {
      console.log('\n❌ Failed tests:');
      results.filter(r => !r.success).forEach(r => {
        console.log(`   - ${r.action}: ${r.message}`);
      });
    }

  } catch (error) {
    console.error('💥 Test error:', error.message);
  } finally {
    await closeSession();
    console.log('\n🏁 Tests complete, browser closed.');
  }
}

runTests();
