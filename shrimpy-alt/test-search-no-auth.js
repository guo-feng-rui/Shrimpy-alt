import fetch from 'node-fetch';

async function testSearchAPINoAuth() {
  console.log('🔍 Testing Search API without authentication...\n');
  
  const query = 'Need ML engineers in Austin';
  console.log(`🔍 Testing: "${query}"`);
  
  try {
    const startTime = Date.now();
    
    const response = await fetch('http://localhost:3000/api/search-connections', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
        // No Authorization header
      },
      body: JSON.stringify({ 
        query,
        userId: 'test-user',
        limit: 5,
        goal: {
          type: 'general',
          description: 'General networking',
          keywords: [],
          preferences: {}
        }
      }),
      signal: AbortSignal.timeout(30000) // 30 second timeout
    });
    
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    console.log(`⏱️  Response time: ${duration}ms`);
    console.log(`📊 Status: ${response.status}`);
    
    const responseText = await response.text();
    console.log(`📄 Raw response: ${responseText.substring(0, 200)}...`);
    
    if (response.ok) {
      try {
        const data = JSON.parse(responseText);
        console.log(`✅ Success! Results found:`, data.results?.length || 0);
      } catch (parseError) {
        console.error(`❌ JSON parse error:`, parseError.message);
      }
    } else {
      console.error(`❌ HTTP error: ${response.status}`);
      console.error('Full response:', responseText);
    }
    
  } catch (error) {
    console.error(`❌ Request error:`, error.message);
  }
}

testSearchAPINoAuth().catch(console.error);