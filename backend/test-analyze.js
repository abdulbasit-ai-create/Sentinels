// ============================================================
//  Sentinels — Quick backend test
//  Run: node backend/test-analyze.js
// ============================================================

require('dotenv').config({ path: './backend/.env' });

const testPayload = {
  url: 'https://example-suspicious-shop.ru',
  domain: 'example-suspicious-shop.ru',
  title: 'MEGA SALE - iPhone 15 Pro for $19!!!',
  hasSSL: false,
  reviews: [
    'Amazing product! Best ever! 5 stars!',
    'Amazing product! Best ever! 5 stars!',
    'Amazing product! Best ever! 5 stars!',
    'Shipped fast, love it, 5 stars!!!',
  ],
  prices: ['$19.99', '$19.99', '$19.99'],
  formFields: ['text:ssn', 'text:passport', 'email:email', 'tel:phone'],
  darkPatterns: ['Fake scarcity messaging', 'Countdown timer detected', 'Guilt-trip opt-out language'],
  bodyText: 'LIMITED TIME ONLY! iPhone 15 Pro MAX for only $19! Only 2 left! Act now before this offer expires! Hurry! We ship worldwide. No returns.',
  reviewCount: 4,
  links: []
};

async function runTest() {
  console.log('\n🛡️ Sentinels — Backend Test\n');
  console.log('Testing with payload:', testPayload.url);
  console.log('---');

  try {
    const response = await fetch('http://localhost:3001/api/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testPayload)
    });

    const result = await response.json();

    console.log('\n✅ RESULT:');
    console.log(`  Score:    ${result.score}/100`);
    console.log(`  Verdict:  ${result.verdict}`);
    console.log(`  Summary:  ${result.summary}`);
    console.log(`  Flags:    ${result.flags?.length || 0} issues found`);
    result.flags?.forEach(f => console.log(`    - ${f}`));
    console.log(`  Time:     ${result.analysisMs}ms\n`);

  } catch (err) {
    console.error('❌ Test failed:', err.message);
    console.error('Make sure the backend is running: npm start\n');
  }
}

runTest();
