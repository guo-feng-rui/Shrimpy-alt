import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:3000'; // Updated to 3000 based on server output

async function testAIIntent() {
  console.log('🤖 Testing AI-Powered Intent Classification...\n');
  
  const testCases = [
    // Search queries (should trigger search)
    'Need ML engineers in Austin',
    'Looking for React developers in Taiwan',
    'Find Python developers',
    'Hire frontend engineers',
    'Connect with data scientists',
    'Search for UX designers in San Francisco',
    'I need a React developer for my project',
    'Looking for someone with machine learning experience',
    
    // Regular chat (should not trigger search)
    'Hi',
    'Hello there',
    'How are you?',
    'Thanks for your help',
    'What is this app?',
    'How do I upload my data?',
    'Can you explain the features?',
    'Goodbye',
    'I need help with the app',
    'What can you do?',
    
    // Edge cases
    'I need help with React development',
    'Looking for advice on hiring',
    'What skills do I need?',
    'Can you help me find people?',
    'I want to connect with professionals'
  ];
  
  console.log('Testing AI intent classification:\n');
  
  for (let i = 0; i < testCases.length; i++) {
    const message = testCases[i];
    console.log(`${i + 1}. Testing: "${message}"`);
    
    try {
      const response = await fetch(`${BASE_URL}/api/classify-intent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message })
      });
      
      if (response.ok) {
        const data = await response.json();
        const intent = data.intent;
        const icon = intent.isSearchQuery ? '🔍' : '💬';
        const action = intent.isSearchQuery ? 'SEARCH' : 'CHAT';
        
        console.log(`   ${icon} Action: ${action} (${(intent.confidence * 100).toFixed(1)}% confidence)`);
        console.log(`   Reason: ${intent.reason}`);
        console.log('');
      } else {
        console.log(`   ❌ Failed: ${response.status}`);
        console.log('');
      }
    } catch (error) {
      console.log(`   ❌ Error: ${error.message}`);
      console.log('');
    }
    
    // Small delay between requests
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  console.log('✅ AI intent classification test completed!');
}

testAIIntent().catch(console.error); 