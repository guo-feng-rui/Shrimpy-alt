import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:3000';

async function testChatFix() {
  console.log('🔍 Testing Chat API Fix...\n');
  
  try {
    const response = await fetch(`${BASE_URL}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        messages: [
          {
            id: 'test-message',
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'hi'
              }
            ]
          }
        ]
      })
    });
    
    if (response.ok) {
      console.log('✅ Chat API is working!');
      console.log('Status:', response.status);
      console.log('Headers:', Object.fromEntries(response.headers.entries()));
    } else {
      console.log('❌ Chat API failed');
      console.log('Status:', response.status);
      const errorText = await response.text();
      console.log('Error:', errorText);
    }
    
  } catch (error) {
    console.error('❌ Error testing chat:', error);
  }
}

testChatFix().catch(console.error); 