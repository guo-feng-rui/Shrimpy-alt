import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:3000';

async function checkIndexStatus() {
  console.log('🔍 Checking Firestore Index Status...\n');
  
  try {
    // Test the search API to see if index is ready
    const response = await fetch(`${BASE_URL}/api/search-connections`, {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer mock-test-token',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        query: "test query",
        userId: "test-user",
        limit: 1
      })
    });
    
    const result = await response.json();
    
    if (result.success) {
      console.log('✅ Index Status: READY');
      console.log('📊 Search API is working');
      console.log('🔍 You can now test semantic search!');
      
      if (result.totalFound === 0) {
        console.log('⚠️ No results found - this might be normal for test data');
      } else {
        console.log(`📊 Found ${result.totalFound} results`);
      }
      
    } else {
      console.log('❌ Index Status: ERROR');
      console.log(`Error: ${result.error || 'Unknown error'}`);
    }
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    if (errorMessage.includes('index') || errorMessage.includes('building')) {
      console.log('⏳ Index Status: BUILDING');
      console.log('📊 The Firestore index is still being built');
      console.log('⏰ This typically takes 5-15 minutes');
      console.log('🔍 Check Firebase Console for detailed progress');
      console.log('💡 You can test other features while waiting');
    } else {
      console.log('❌ Index Status: ERROR');
      console.log(`Error: ${errorMessage}`);
    }
  }
  
  console.log('\n💡 Recommendations:');
  console.log('   ⏳ If index is building, wait 5-15 minutes');
  console.log('   🔍 Check Firebase Console for progress');
  console.log('   📊 Test other APIs while waiting');
  console.log('   🚀 Once ready, test semantic search queries');
}

checkIndexStatus().catch(console.error); 