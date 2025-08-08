import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:3001'; // Using the correct port

async function populateTestData() {
  console.log('📊 Populating test data for semantic search...\n');
  
  try {
    // Call the populate test data API
    const response = await fetch(`${BASE_URL}/api/populate-test-data`, {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer mock-test-token',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        userId: "test-user",
        mode: "firestore" // This will create test data directly in Firestore
      })
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const result = await response.json();
    console.log('✅ Test data population result:', JSON.stringify(result, null, 2));
    
    if (result.success) {
      console.log('\n🎉 Test data populated successfully!');
      console.log('📊 You can now test semantic search with queries like:');
      console.log('   • "software engineer in Austin"');
      console.log('   • "business partner in NYC"'); 
      console.log('   • "React developer"');
      console.log('   • "startup founder"');
    }
    
  } catch (error) {
    console.error('❌ Error populating test data:', error.message);
    console.log('\n💡 Troubleshooting:');
    console.log('   • Make sure the dev server is running on port 3001');
    console.log('   • Check Firebase configuration');
    console.log('   • Ensure Firestore indexes are built');
  }
}

populateTestData();