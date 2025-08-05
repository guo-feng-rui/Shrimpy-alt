import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:3000';

const testQueries = [
  "I need help with React development in Taiwan",
  "Looking for ML engineers in Austin",
  "Need DevOps expertise for cloud infrastructure",
  "Seeking frontend developers with Vue.js experience",
  "Want to connect with Stanford alumni",
  "Looking for startup founders in San Francisco",
  "Need Python developers for data science projects",
  "Seeking senior developers with TypeScript skills"
];

async function testSemanticSearch() {
  console.log('🔍 Testing Semantic Search with Various Queries...\n');
  
  for (const query of testQueries) {
    console.log(`\n📝 Query: "${query}"`);
    
    try {
      const response = await fetch(`${BASE_URL}/api/search-connections`, {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer mock-test-token',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          query,
          userId: "test-user",
          limit: 5
        })
      });
      
      const result = await response.json();
      
      if (result.success) {
        console.log(`✅ Found ${result.totalFound} results`);
        
        if (result.smartWeights) {
          console.log('🧠 Smart Weights:');
          Object.entries(result.smartWeights).forEach(([key, value]) => {
            console.log(`   ${key}: ${(value * 100).toFixed(1)}%`);
          });
        }
        
        if (result.results && result.results.length > 0) {
          console.log('📊 Top Results:');
          result.results.slice(0, 3).forEach((result, index) => {
            const name = result.connection?.name || result.connectionId || 'Unknown';
            const score = result.score?.toFixed(3) || 'N/A';
            console.log(`   ${index + 1}. ${name} (Score: ${score})`);
          });
        } else {
          console.log('⚠️ No matching results found');
        }
        
      } else {
        console.log(`❌ Search failed: ${result.error || 'Unknown error'}`);
      }
      
    } catch (error) {
      console.log(`❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
    
    // Wait a bit between queries
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  console.log('\n🎉 Semantic search testing completed!');
}

testSemanticSearch().catch(console.error); 