import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:3000';

async function quickTest() {
  console.log('🔍 Quick Verification of Data Model Updates...\n');
  
  try {
    // Test 1: Check if the server is running
    console.log('1️⃣ Testing server connectivity...');
    const healthResponse = await fetch(`${BASE_URL}/api/search-connections`, {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer mock-test-token',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        userId: 'test-user',
        query: 'test',
        filters: {}
      })
    });
    
    if (healthResponse.ok) {
      console.log('✅ Server is running');
    } else {
      console.log('❌ Server not responding properly');
      return;
    }
    
    // Test 2: Test embedding generation with new structure
    console.log('\n2️⃣ Testing embedding generation...');
    const testConnection = {
      name: "Test User",
      position: "Software Engineer",
      company: "Test Corp",
      summary: "Experienced developer with React and TypeScript skills",
      experiences: [
        {
          title: "Software Engineer",
          company: "Test Corp",
          duration: "2 years",
          description: "Developed React applications",
          start: { year: 2022, month: 1 },
          end: { year: 2024, month: 1 }
        }
      ],
      educations: [
        {
          degree: "Bachelor of Science",
          institution: "Test University",
          field: "Computer Science",
          start: { year: 2018, month: 9 },
          end: { year: 2022, month: 5 }
        }
      ],
      skills: ["React", "TypeScript"]
    };
    
    const embedResponse = await fetch(`${BASE_URL}/api/generate-embeddings`, {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer mock-test-token',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        userId: 'test-user',
        connectionData: testConnection
      })
    });
    
    if (embedResponse.ok) {
      const embedResult = await embedResponse.json();
      console.log('✅ Embedding generation successful');
      console.log(`   Model: ${embedResult.model}`);
      console.log(`   Dimensions: ${embedResult.dimensions}`);
      console.log(`   Summary vector: ${embedResult.embeddings.summary ? '✅' : '❌'}`);
      console.log(`   Experience vector: ${embedResult.embeddings.experience ? '✅' : '❌'}`);
      console.log(`   Education vector: ${embedResult.embeddings.education ? '✅' : '❌'}`);
    } else {
      console.log('❌ Embedding generation failed');
      const errorText = await embedResponse.text();
      console.log(`   Error: ${errorText}`);
    }
    
    // Test 3: Test data population
    console.log('\n3️⃣ Testing data population...');
    const populateResponse = await fetch(`${BASE_URL}/api/populate-test-data`, {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer mock-test-token',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        userId: 'test-user',
        mode: 'firestore'
      })
    });
    
    if (populateResponse.ok) {
      const populateResult = await populateResponse.json();
      console.log('✅ Data population successful');
      console.log(`   Success: ${populateResult.success}`);
      console.log(`   Failed: ${populateResult.failed}`);
    } else {
      console.log('❌ Data population failed');
      const errorText = await populateResponse.text();
      console.log(`   Error: ${errorText}`);
    }
    
    // Test 4: Test search functionality
    console.log('\n4️⃣ Testing search functionality...');
    const searchResponse = await fetch(`${BASE_URL}/api/search-connections`, {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer mock-test-token',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        userId: 'test-user',
        query: 'software engineer',
        filters: {}
      })
    });
    
    if (searchResponse.ok) {
      const searchResult = await searchResponse.json();
      console.log('✅ Search successful');
      console.log(`   Results found: ${searchResult.results?.length || 0}`);
      if (searchResult.results && searchResult.results.length > 0) {
        const topResult = searchResult.results[0];
        console.log(`   Top result: ${topResult.connection.name}`);
        console.log(`   Score: ${topResult.score.toFixed(3)}`);
        
        // Check data structure
        if (topResult.connection.experiences && Array.isArray(topResult.connection.experiences)) {
          console.log('   ✅ Has experiences[] array');
        }
        if (topResult.connection.educations && Array.isArray(topResult.connection.educations)) {
          console.log('   ✅ Has educations[] array');
        }
        if (topResult.connection.summary) {
          console.log('   ✅ Has summary field');
        }
      }
    } else {
      console.log('❌ Search failed');
      const errorText = await searchResponse.text();
      console.log(`   Error: ${errorText}`);
    }
    
    console.log('\n🎉 Quick verification complete!');
    
  } catch (error) {
    console.error('❌ Quick test failed:', error.message);
  }
}

quickTest();
