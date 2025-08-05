import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:3000';

async function debugSearch() {
  console.log('🔍 Debugging Search Issues...\n');
  
  // Step 1: Check what data exists in Firestore
  console.log('📊 Step 1: Checking Firestore data...');
  try {
    const response = await fetch(`${BASE_URL}/api/search-connections`, {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer mock-test-token',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        query: "test",
        userId: "test-user",
        limit: 10,
        debug: true // Add debug flag
      })
    });
    
    const result = await response.json();
    console.log('✅ Search API Response:', JSON.stringify(result, null, 2));
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
  
  // Step 2: Test with a very simple query
  console.log('\n📝 Step 2: Testing with simple query...');
  try {
    const response = await fetch(`${BASE_URL}/api/search-connections`, {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer mock-test-token',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        query: "React", // Simple single word
        userId: "test-user",
        limit: 10
      })
    });
    
    const result = await response.json();
    console.log('✅ Simple Query Result:', JSON.stringify(result, null, 2));
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
  
  // Step 3: Check if data population worked
  console.log('\n📊 Step 3: Checking data population...');
  try {
    const response = await fetch(`${BASE_URL}/api/populate-test-data`, {
      method: 'GET',
      headers: {
        'Authorization': 'Bearer mock-test-token',
        'Content-Type': 'application/json'
      }
    });
    
    const result = await response.json();
    console.log('✅ Data Population Status:', JSON.stringify(result, null, 2));
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

debugSearch().catch(console.error); 