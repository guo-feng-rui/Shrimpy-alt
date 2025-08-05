import fetch from 'node-fetch';

async function testDetailedScoring() {
  console.log('🔍 Testing Detailed Scoring...\n');
  
  const query = 'Need ML engineers in Austin';
  console.log(`🔍 Testing: "${query}"`);
  
  try {
    const response = await fetch('http://localhost:3000/api/search-connections', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
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
      signal: AbortSignal.timeout(30000)
    });
    
    console.log(`📊 Status: ${response.status}`);
    
    if (response.ok) {
      const data = await response.json();
      console.log('\n✅ Search Results with Detailed Scoring:');
      console.log(`🎯 Query: ${data.query}`);
      console.log(`📊 Total Results: ${data.results?.length || 0}`);
      
      if (data.results && data.results.length > 0) {
        data.results.forEach((result, index) => {
          const connection = result.connection;
          const score = (result.weightedScore * 100).toFixed(1);
          
          console.log(`\n${index + 1}. 📋 **${connection.name}** (${score}% match)`);
          console.log(`   💼 Position: ${connection.position} at ${connection.company}`);
          console.log(`   🛠️  Skills: ${connection.skills?.slice(0, 4).join(', ') || 'N/A'}`);
          console.log(`   📍 Location: ${connection.location || 'N/A'}`);
          console.log(`   🎯 Raw Score: ${result.weightedScore.toFixed(4)}`);
          
          if (result.relevanceBreakdown) {
            console.log('   📊 Breakdown:');
            console.log(`      Skills: ${(result.relevanceBreakdown.skills * 100).toFixed(1)}%`);
            console.log(`      Location: ${(result.relevanceBreakdown.location * 100).toFixed(1)}%`);
            console.log(`      Company: ${(result.relevanceBreakdown.company * 100).toFixed(1)}%`);
          }
        });
        
        console.log(`\n🎯 Top Match Analysis:`);
        const topResult = data.results[0];
        const topScore = topResult.weightedScore * 100;
        
        if (topScore > 70) {
          console.log(`✅ Excellent match! (${topScore.toFixed(1)}%)`);
        } else if (topScore > 40) {
          console.log(`👍 Good match! (${topScore.toFixed(1)}%)`);
        } else if (topScore > 20) {
          console.log(`🔍 Moderate match (${topScore.toFixed(1)}%)`);
        } else {
          console.log(`⚠️  Low match (${topScore.toFixed(1)}%)`);
        }
      }
      
    } else {
      console.error(`❌ HTTP error: ${response.status}`);
      const errorText = await response.text();
      console.error('Error response:', errorText);
    }
    
  } catch (error) {
    console.error(`❌ Request error:`, error.message);
  }
}

testDetailedScoring().catch(console.error);