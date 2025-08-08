/**
 * Test script to generate embeddings from profileCache
 * 
 * Usage: node test-embedding-generation.mjs
 * 
 * Make sure your Next.js server is running on port 3000 before running this script.
 */

import http from 'http';

function makeRequest(path, method = 'GET', data = null, timeout = 5000) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: path,
      method: method,
      headers: {
        'Authorization': 'Bearer mock-test-token'
      }
    };

    if (data) {
      const jsonData = JSON.stringify(data);
      options.headers['Content-Type'] = 'application/json';
      options.headers['Content-Length'] = jsonData.length;
    }

    // Add timeout
    const timer = setTimeout(() => {
      req.destroy();
      reject(new Error(`Request timeout after ${timeout}ms - server may not be running`));
    }, timeout);

    const req = http.request(options, (res) => {
      clearTimeout(timer);
      let responseData = '';
      
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try {
            resolve(JSON.parse(responseData));
          } catch (e) {
            resolve(responseData);
          }
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${responseData}`));
        }
      });
    });

    req.on('error', (error) => {
      clearTimeout(timer);
      reject(error);
    });
    
    if (data) {
      req.write(JSON.stringify(data));
    }
    
    req.end();
  });
}

async function testEmbeddingGeneration() {
  const userId = 'ygSb7rjydShbQTAGwmQw9I1bGbC2';
  
  console.log('========================================');
  console.log('Testing Embedding Generation from profileCache');
  console.log('========================================\n');
  
  try {
    // Step 1: Test server health
    console.log('1. Testing server health...');
    try {
      await makeRequest('/api/populate-test-data?userId=' + userId, 'GET');
      console.log('   ✅ Server is responding\n');
    } catch (error) {
      console.log('   ❌ Server health check failed:', error.message);
      console.log('   Make sure your Next.js server is running: npm run dev\n');
      return;
    }
    
    // Step 2: Trigger embedding generation
    console.log('2. Triggering embedding generation from profileCache...');
    console.log('   User ID:', userId);
    console.log('   Mode: profileCache\n');
    
    const result = await makeRequest('/api/populate-test-data', 'POST', {
      mode: 'profileCache',
      userId: userId
    });
    
    console.log('3. Result:');
    console.log('   Success:', result.success || false);
    console.log('   Message:', result.message || 'No message');
    
    if (result.populationResult) {
      console.log('\n4. Population Result:');
      console.log('   Successful:', result.populationResult.success || 0);
      console.log('   Failed:', result.populationResult.failed || 0);
      
      if (result.populationResult.errors && result.populationResult.errors.length > 0) {
        console.log('   Errors:');
        result.populationResult.errors.forEach(err => {
          console.log('     -', err);
        });
      }
    }
    
    console.log('\n========================================');
    console.log('IMPORTANT: Check the server terminal for detailed logs!');
    console.log('The server terminal is where you ran "npm run dev"');
    console.log('========================================');
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.log('\nTroubleshooting:');
    console.log('1. Make sure your Next.js server is running: npm run dev');
    console.log('2. Check that the server is on port 3000');
    console.log('3. Look at the server terminal for error messages');
  }
}

// Run the test
testEmbeddingGeneration();
