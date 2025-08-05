import fetch from 'node-fetch';

async function testSearchAPI() {
  console.log('🔍 Testing Search API...\n');
  
  const testQueries = [
    'Need ML engineers in Austin',
    'React developers',
    'Python developers'
  ];
  
  for (const query of testQueries) {
    console.log(`\n🔍 Testing: "${query}"`);
    
    try {
      const startTime = Date.now();
      
      const response = await fetch('http://localhost:3000/api/search-connections', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer mock-test-token'
        },
        body: JSON.stringify({ 
          query,
          userId: 'test-user',
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
      console.log(`📄 Raw response: ${responseText.substring(0, 500)}...`);
      
      if (response.ok) {
        try {
          const data = JSON.parse(responseText);
          console.log(`✅ Parsed response:`, {
            success: data.success,
            resultsCount: data.results?.length || 0,
            totalFound: data.totalFound
          });
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

testSearchAPI().catch(console.error); 