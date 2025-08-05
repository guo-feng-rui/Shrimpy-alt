import fetch from 'node-fetch';

async function testIntentAPI() {
  console.log('🧪 Testing Intent Classification API...\n');
  
  const testMessages = [
    'Hi',
    'Need ML engineers in Austin',
    'How are you?'
  ];
  
  for (const message of testMessages) {
    console.log(`\n🔍 Testing: "${message}"`);
    
    try {
      const startTime = Date.now();
      
      const response = await fetch('http://localhost:3000/api/classify-intent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message }),
        signal: AbortSignal.timeout(15000) // 15 second timeout
      });
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      console.log(`⏱️  Response time: ${duration}ms`);
      console.log(`📊 Status: ${response.status}`);
      
      const responseText = await response.text();
      console.log(`📄 Raw response: ${responseText}`);
      
      if (response.ok) {
        try {
          const data = JSON.parse(responseText);
          console.log(`✅ Parsed response:`, data);
        } catch (parseError) {
          console.error(`❌ JSON parse error:`, parseError.message);
        }
      } else {
        console.error(`❌ HTTP error: ${response.status}`);
      }
      
    } catch (error) {
      console.error(`❌ Request error:`, error.message);
    }
  }
}

testIntentAPI().catch(console.error); 