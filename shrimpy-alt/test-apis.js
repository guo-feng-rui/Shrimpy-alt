import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:3000';

// Test authentication variables
let authToken = null;
let testUserId = 'test-user'; // Use consistent user ID

async function setupTestAuth() {
  try {
    console.log('🔐 Setting up test authentication...');
    
    // For now, we'll use a mock authentication
    // In a real scenario, you'd use Firebase Auth
    authToken = 'mock-test-token';
    // Keep testUserId as 'test-user' for consistency
    
    console.log('✅ Test authentication setup complete');
    console.log(`   User ID: ${testUserId}`);
    console.log(`   Token: ${authToken.substring(0, 20)}...`);
  } catch (error) {
    console.error('❌ Failed to setup test authentication:', error);
    throw error;
  }
}

function getTestAuthHeaders() {
  return {
    'Authorization': `Bearer ${authToken}`,
    'Content-Type': 'application/json'
  };
}

async function testGoalClassification() {
  console.log('🎯 Testing Goal Classification API...');
  
  try {
    const response = await fetch(`${BASE_URL}/api/classify-goal`, {
      method: 'POST',
      headers: getTestAuthHeaders(),
      body: JSON.stringify({
        message: "I need help with React development in Taiwan",
        userId: testUserId
      })
    });
    
    const result = await response.json();
    console.log('✅ Goal Classification Result:', JSON.stringify(result, null, 2));
    return result;
  } catch (error) {
    console.error('❌ Goal Classification failed:', error);
  }
}

async function testSmartWeighting() {
  console.log('\n🧠 Testing Smart Weighting API...');
  
  try {
    const response = await fetch(`${BASE_URL}/api/test-smart-weighting`, {
      method: 'POST',
      headers: getTestAuthHeaders(),
      body: JSON.stringify({
        query: "I need someone who can help me scale my business in Taiwan"
      })
    });
    
    const result = await response.json();
    console.log('✅ Smart Weighting Result:', JSON.stringify(result, null, 2));
    return result;
  } catch (error) {
    console.error('❌ Smart Weighting failed:', error);
  }
}

async function testEmbeddingGeneration() {
  console.log('\n📊 Testing Embedding Generation API...');
  
  try {
    const connectionData = {
      id: 'test-connection-1',
      skills: ['React', 'TypeScript', 'Node.js'],
      experience: {
        title: 'Senior Developer',
        company: 'Tech Corp',
        duration: '3 years'
      },
      company: {
        name: 'Tech Corp',
        industry: 'Technology',
        size: '100-500'
      },
      location: {
        city: 'Taipei',
        country: 'Taiwan',
        region: 'Asia'
      },
      network: {
        mutualConnections: '15',
        alumni: 'Stanford',
        referrals: '2'
      },
      goal: {
        interests: 'AI/ML',
        aspirations: 'Tech Lead',
        careerObjectives: 'Build scalable products'
      },
      education: {
        degree: 'BS Computer Science',
        institution: 'Stanford University',
        field: 'Computer Science'
      }
    };
    
    const response = await fetch(`${BASE_URL}/api/generate-embeddings`, {
      method: 'POST',
      headers: getTestAuthHeaders(),
      body: JSON.stringify({
        connectionData,
        userId: testUserId
      })
    });
    
    const result = await response.json();
    console.log('✅ Embedding Generation Result:', JSON.stringify(result, null, 2));
    return result;
  } catch (error) {
    console.error('❌ Embedding Generation failed:', error);
  }
}

async function testDataPopulation() {
  console.log('\n📊 Testing Data Population API...');
  
  try {
    // Test your preferred flow: Generate embeddings from existing Firestore data
    console.log('🔄 Testing your preferred flow: Generate embeddings from profileCache...');
    
    const firestoreResponse = await fetch(`${BASE_URL}/api/populate-test-data`, {
      method: 'POST',
      headers: getTestAuthHeaders(),
      body: JSON.stringify({
        userId: testUserId,
        mode: "firestore" // Use your preferred flow
      })
    });
    
    const firestoreResult = await firestoreResponse.json();
    console.log('✅ Firestore Data Population Result:', JSON.stringify(firestoreResult, null, 2));
    
    // Also test CSV flow for comparison
    console.log('\n🔄 Testing CSV flow for comparison...');
    
    const sampleResponse = await fetch(`${BASE_URL}/api/populate-test-data?userId=${testUserId}`);
    const sampleData = await sampleResponse.json();
    
    if (sampleData.success) {
      const csvResponse = await fetch(`${BASE_URL}/api/populate-test-data`, {
        method: 'POST',
        headers: getTestAuthHeaders(),
        body: JSON.stringify({
          csvContent: sampleData.sampleCSV,
          userId: testUserId,
          mode: "csv"
        })
      });
      
      const csvResult = await csvResponse.json();
      console.log('✅ CSV Data Population Result:', JSON.stringify(csvResult, null, 2));
    }
    
    return firestoreResult;
  } catch (error) {
    console.error('❌ Data Population failed:', error);
  }
}

async function testSearchConnections() {
  console.log('\n🔍 Testing Search Connections API...');
  
  try {
    const response = await fetch(`${BASE_URL}/api/search-connections`, {
      method: 'POST',
      headers: getTestAuthHeaders(),
      body: JSON.stringify({
        query: "I need help with React development in Taiwan",
        userId: testUserId,
        goal: {
          type: "skill_development",
          description: "Learning new skills",
          keywords: ["react", "development"],
          preferences: {}
        },
        limit: 5
      })
    });
    
    const result = await response.json();
    console.log('✅ Search Connections Result:', JSON.stringify(result, null, 2));
    return result;
  } catch (error) {
    console.error('❌ Search Connections failed:', error);
  }
}

async function runAllTests() {
  console.log('🚀 Starting API Tests...\n');
  
  // Setup authentication first
  await setupTestAuth();
  
  await testGoalClassification();
  await testSmartWeighting();
  await testEmbeddingGeneration();
  await testDataPopulation();
  await testSearchConnections();
  
  console.log('\n✅ All tests completed!');
}

// Run the tests
runAllTests().catch(console.error); 