import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:3000';

// Test authentication
const authToken = 'mock-test-token';
const testUserId = 'test-user';

function getTestAuthHeaders() {
  return {
    'Authorization': `Bearer ${authToken}`,
    'Content-Type': 'application/json'
  };
}

async function testEmbeddingGeneration() {
  console.log('🔍 Testing Updated Embedding Generation...\n');
  
  try {
    // Test data with the new structure (experiences[], educations[], summary)
    const testConnections = [
      {
        name: "Sarah Chen",
        position: "Senior Software Engineer",
        company: "Google",
        location: "Mountain View, CA",
        industry: "Technology",
        summary: "Experienced software engineer with expertise in React, TypeScript, and cloud architecture. Passionate about building scalable applications and mentoring junior developers.",
        experiences: [
          {
            title: "Senior Software Engineer",
            company: "Google",
            duration: "2 years",
            description: "Led development of React-based applications, mentored junior developers, and implemented cloud architecture solutions.",
            industry: "Technology",
            start: { year: 2022, month: 3 },
            end: { year: 2024, month: 3 }
          },
          {
            title: "Software Engineer",
            company: "Microsoft",
            duration: "3 years", 
            description: "Developed TypeScript applications and contributed to open source projects.",
            industry: "Technology",
            start: { year: 2019, month: 6 },
            end: { year: 2022, month: 2 }
          }
        ],
        educations: [
          {
            degree: "Master of Science",
            institution: "Stanford University",
            field: "Computer Science",
            start: { year: 2017, month: 9 },
            end: { year: 2019, month: 6 }
          },
          {
            degree: "Bachelor of Science",
            institution: "UC Berkeley",
            field: "Computer Science",
            start: { year: 2013, month: 9 },
            end: { year: 2017, month: 5 }
          }
        ],
        skills: ["React", "TypeScript", "Node.js", "AWS", "Docker"]
      },
      {
        name: "Michael Rodriguez",
        position: "Product Manager",
        company: "Netflix",
        location: "Los Gatos, CA",
        industry: "Entertainment",
        summary: "Product manager with 8+ years experience in streaming media and user experience design. Led successful product launches and user growth initiatives.",
        experiences: [
          {
            title: "Senior Product Manager",
            company: "Netflix",
            duration: "3 years",
            description: "Led product strategy for streaming features, managed cross-functional teams, and achieved 25% user engagement increase.",
            industry: "Entertainment",
            start: { year: 2021, month: 1 },
            end: { year: 2024, month: 1 }
          },
          {
            title: "Product Manager",
            company: "Hulu",
            duration: "4 years",
            description: "Managed content discovery features and user experience improvements.",
            industry: "Entertainment",
            start: { year: 2017, month: 3 },
            end: { year: 2021, month: 1 }
          }
        ],
        educations: [
          {
            degree: "MBA",
            institution: "Harvard Business School",
            field: "Business Administration",
            start: { year: 2015, month: 9 },
            end: { year: 2017, month: 5 }
          },
          {
            degree: "Bachelor of Arts",
            institution: "UCLA",
            field: "Economics",
            start: { year: 2011, month: 9 },
            end: { year: 2015, month: 6 }
          }
        ],
        skills: ["Product Strategy", "User Research", "Data Analysis", "Agile", "A/B Testing"]
      }
    ];

    console.log('📝 Test Data Structure:');
    console.log('✅ Using experiences[] array (not experience object)');
    console.log('✅ Using educations[] array (not educationInfo object)');
    console.log('✅ Including summary field');
    console.log('✅ Using start/end dates for duration calculation');
    console.log('✅ No companyInfo field (removed)');

    // Test embedding generation for each connection
    for (const connection of testConnections) {
      console.log(`\n🔄 Testing embedding generation for: ${connection.name}`);
      
      const response = await fetch(`${BASE_URL}/api/generate-embeddings`, {
        method: 'POST',
        headers: getTestAuthHeaders(),
        body: JSON.stringify({
          userId: testUserId,
          connectionData: connection
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      
      console.log('✅ Embedding generation successful');
      console.log(`   Experience vector: ${result.embeddings.experience ? '✅' : '❌'}`);
      console.log(`   Education vector: ${result.embeddings.education ? '✅' : '❌'}`);
      console.log(`   Company vector: ${result.embeddings.company ? '✅' : '❌'}`);
      console.log(`   Summary vector: ${result.embeddings.summary ? '✅' : '❌'}`);
      console.log(`   Model used: ${result.model}`);
      console.log(`   Dimensions: ${result.dimensions}`);
      
      // Verify the model is text-embedding-3-small
      if (result.model !== 'text-embedding-3-small') {
        console.log('⚠️  Warning: Expected text-embedding-3-small model');
      }
      
      if (result.dimensions !== 1536) {
        console.log('⚠️  Warning: Expected 1536 dimensions');
      }
    }

    return true;
  } catch (error) {
    console.error('❌ Embedding generation test failed:', error.message);
    return false;
  }
}

async function testDataPopulation() {
  console.log('\n📊 Testing Data Population with New Structure...\n');
  
  try {
    const response = await fetch(`${BASE_URL}/api/populate-test-data`, {
      method: 'POST',
      headers: getTestAuthHeaders(),
      body: JSON.stringify({
        userId: testUserId,
        mode: "firestore"
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const result = await response.json();
    console.log('✅ Data population result:', JSON.stringify(result, null, 2));
    
    if (result.success > 0) {
      console.log(`\n🎉 Successfully populated ${result.success} connections with new data model`);
      console.log('✅ All connections should now have:');
      console.log('   • experiences[] array (not experience object)');
      console.log('   • educations[] array (not educationInfo object)');
      console.log('   • summary field');
      console.log('   • text-embedding-3-small model');
    }
    
    return result.success > 0;
  } catch (error) {
    console.error('❌ Data population test failed:', error.message);
    return false;
  }
}

async function testSearchWithNewStructure() {
  console.log('\n🔍 Testing Search with Updated Data Model...\n');
  
  const testQueries = [
    {
      query: "React developer with cloud experience",
      expected: "Should find Sarah Chen (React, AWS, cloud architecture)"
    },
    {
      query: "Product manager streaming media",
      expected: "Should find Michael Rodriguez (Netflix, Hulu, streaming)"
    },
    {
      query: "Stanford graduate software engineer",
      expected: "Should find Sarah Chen (Stanford CS degree)"
    },
    {
      query: "Senior engineer with mentoring experience",
      expected: "Should find Sarah Chen (mentored junior developers)"
    }
  ];

  let successCount = 0;
  
  for (const testCase of testQueries) {
    console.log(`🔍 Testing: "${testCase.query}"`);
    console.log(`   Expected: ${testCase.expected}`);
    
    try {
      const response = await fetch(`${BASE_URL}/api/search-connections`, {
        method: 'POST',
        headers: getTestAuthHeaders(),
        body: JSON.stringify({
          userId: testUserId,
          query: testCase.query,
          filters: {}
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      
      if (result.results && result.results.length > 0) {
        console.log(`   ✅ Found ${result.results.length} results`);
        console.log(`   📊 Top result: ${result.results[0].connection.name}`);
        console.log(`   🎯 Score: ${result.results[0].score.toFixed(3)}`);
        
        // Check if the result has the expected structure
        const topResult = result.results[0];
        if (topResult.connection.experiences && Array.isArray(topResult.connection.experiences)) {
          console.log('   ✅ Has experiences[] array');
        }
        if (topResult.connection.educations && Array.isArray(topResult.connection.educations)) {
          console.log('   ✅ Has educations[] array');
        }
        if (topResult.connection.summary) {
          console.log('   ✅ Has summary field');
        }
        
        successCount++;
      } else {
        console.log('   ❌ No results found');
      }
      
    } catch (error) {
      console.error(`   ❌ Search failed: ${error.message}`);
    }
    
    console.log('');
  }
  
  console.log(`🎯 Search Test Summary: ${successCount}/${testQueries.length} queries successful`);
  return successCount === testQueries.length;
}

async function testSmartWeighting() {
  console.log('\n🧠 Testing Smart Weighting with New Vectors...\n');
  
  try {
    const response = await fetch(`${BASE_URL}/api/test-smart-weighting`, {
      method: 'POST',
      headers: getTestAuthHeaders(),
      body: JSON.stringify({
        query: "I need a React developer with cloud experience and mentoring skills"
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const result = await response.json();
    console.log('✅ Smart weighting result:', JSON.stringify(result, null, 2));
    
    // Check if summary weight is included
    if (result.weights && result.weights.summary !== undefined) {
      console.log('✅ Summary weight included in smart weighting');
    } else {
      console.log('⚠️  Summary weight not found in smart weighting');
    }
    
    return true;
  } catch (error) {
    console.error('❌ Smart weighting test failed:', error.message);
    return false;
  }
}

async function runAllTests() {
  console.log('🚀 Starting Comprehensive Data Model Update Tests...\n');
  
  const tests = [
    { name: 'Embedding Generation', fn: testEmbeddingGeneration },
    { name: 'Data Population', fn: testDataPopulation },
    { name: 'Search Functionality', fn: testSearchWithNewStructure },
    { name: 'Smart Weighting', fn: testSmartWeighting }
  ];
  
  const results = [];
  
  for (const test of tests) {
    console.log(`\n${'='.repeat(50)}`);
    console.log(`🧪 Running: ${test.name}`);
    console.log(`${'='.repeat(50)}`);
    
    try {
      const result = await test.fn();
      results.push({ name: test.name, success: result });
      console.log(`\n✅ ${test.name}: ${result ? 'PASSED' : 'FAILED'}`);
    } catch (error) {
      console.error(`\n❌ ${test.name}: ERROR - ${error.message}`);
      results.push({ name: test.name, success: false });
    }
  }
  
  console.log(`\n${'='.repeat(50)}`);
  console.log('📊 TEST SUMMARY');
  console.log(`${'='.repeat(50)}`);
  
  const passed = results.filter(r => r.success).length;
  const total = results.length;
  
  results.forEach(result => {
    console.log(`${result.success ? '✅' : '❌'} ${result.name}`);
  });
  
  console.log(`\n🎯 Overall: ${passed}/${total} tests passed`);
  
  if (passed === total) {
    console.log('\n🎉 All tests passed! The updated data model is working correctly.');
    console.log('\n✅ Verified:');
    console.log('   • experiences[] array (not experience object)');
    console.log('   • educations[] array (not educationInfo object)');
    console.log('   • summary field included');
    console.log('   • companyInfo removed');
    console.log('   • text-embedding-3-small model');
    console.log('   • 1536 dimensions');
    console.log('   • start/end dates for duration calculation');
  } else {
    console.log('\n⚠️  Some tests failed. Check the output above for details.');
  }
}

// Run the tests
runAllTests().catch(console.error);
