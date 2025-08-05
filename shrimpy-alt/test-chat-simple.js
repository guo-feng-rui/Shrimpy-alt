import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:3000';

async function testChatSimple() {
  console.log('💬 Testing Simple Chat API...\n');
  
  try {
    // Test the chat API directly
    const response = await fetch(`${BASE_URL}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        messages: [{ role: 'user', content: 'Hi' }]
      })
    });
    
    console.log('Chat API Response Status:', response.status);
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Chat API working:', data);
    } else {
      console.log('❌ Chat API failed:', response.status);
    }
  } catch (error) {
    console.log('❌ Chat API error:', error.message);
  }
  
  console.log('\n💬 Testing Intent Classification API...\n');
  
  try {
    // Test the intent classification API
    const response = await fetch(`${BASE_URL}/api/classify-intent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'Hi' })
    });
    
    console.log('Intent API Response Status:', response.status);
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Intent API working:', data);
    } else {
      console.log('❌ Intent API failed:', response.status);
      const errorText = await response.text();
      console.log('Error details:', errorText);
    }
  } catch (error) {
    console.log('❌ Intent API error:', error.message);
  }
}

testChatSimple().catch(console.error); 