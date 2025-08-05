import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:3000';

async function debugResults() {
  console.log('🔍 Debugging Search Results...\n');
  
  try {
    const response = await fetch(`${BASE_URL}/api/search-connections`, {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer mock-test-token',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        query: "React development in Taiwan",
        userId: "test-user",
        limit: 5
      })
    });
    
    const result = await response.json();
    console.log('✅ Full Search Result:', JSON.stringify(result, null, 2));
    
    if (result.results && result.results.length > 0) {
      console.log('\n📊 First Result Details:');
      const firstResult = result.results[0];
      console.log('Connection ID:', firstResult.connectionId);
      console.log('Connection Data:', JSON.stringify(firstResult.connection, null, 2));
      console.log('Score:', firstResult.score);
      console.log('Weighted Score:', firstResult.weightedScore);
      console.log('Relevance:', firstResult.relevance);
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

debugResults().catch(console.error); 