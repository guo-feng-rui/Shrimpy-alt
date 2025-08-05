// Test script for Smart Weighting System
const testQueries = [
  "Find senior Python developers in San Francisco",
  "I need someone who can help me scale my business",
  "Looking for a mentor who understands the startup world",
  "Want to connect with people who are passionate about AI",
  "Need someone with experience in the field",
  "Anyone working on interesting projects?",
  "Specifically looking for a senior React developer with 5+ years experience",
  "Maybe someone who kind of knows about machine learning?",
  "I'm desperate to find someone who can help me with this urgent project"
];

const userGoals = [
  { type: 'job_search', description: 'Job Search' },
  { type: 'startup_building', description: 'Startup Building' },
  { type: 'mentorship', description: 'Mentorship' },
  { type: 'skill_development', description: 'Skill Development' },
  { type: 'general', description: 'General' }
];

async function testSmartWeighting() {
  console.log('🧠 Testing Smart Weighting System\n');
  
  for (const query of testQueries) {
    console.log(`\n📝 Query: "${query}"`);
    
    try {
      // Test without goal
      const response = await fetch('http://localhost:3001/api/test-smart-weighting', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query })
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const result = await response.json();
      
      if (result.success) {
        console.log('✅ Analysis Results:');
        console.log(`   Primary Intent: ${result.analysis.primaryIntent}`);
        console.log(`   Urgency: ${result.analysis.urgency}`);
        console.log(`   Specificity: ${result.analysis.specificity}`);
        console.log(`   Context: ${result.analysis.context}`);
        
        console.log('\n📊 Smart Weights:');
        Object.entries(result.weights).forEach(([aspect, weight]) => {
          const percentage = (weight * 100).toFixed(1);
          const bar = '█'.repeat(Math.floor(weight * 10));
          console.log(`   ${aspect.padEnd(12)} ${percentage.padStart(5)}% ${bar}`);
        });
        
        console.log('\n🔍 Pattern Recognition:');
        Object.entries(result.patterns).forEach(([aspect, score]) => {
          if (score > 0) {
            console.log(`   ${aspect}: ${score.toFixed(2)}`);
          }
        });
        
        console.log('\n🎯 Context Analysis:');
        console.log(`   Urgency: ${result.context.urgency}`);
        console.log(`   Specificity: ${result.context.specificity}`);
        console.log(`   Complexity: ${result.context.complexity}`);
        console.log(`   Time Sensitive: ${result.context.timeSensitivity}`);
        
      } else {
        console.log('❌ Test failed:', result.error);
      }
      
    } catch (error) {
      console.log('❌ Test failed:', error.message);
    }
    
    console.log('\n' + '─'.repeat(80));
  }
  
  // Test with different goals
  console.log('\n🎯 Testing with Different User Goals\n');
  
  const testQuery = "Looking for experienced developers";
  
  for (const goal of userGoals) {
    console.log(`\n📝 Query: "${testQuery}" with Goal: ${goal.description}`);
    
    try {
      const response = await fetch('http://localhost:3001/api/test-smart-weighting', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          query: testQuery,
          goal: {
            type: goal.type,
            description: goal.description,
            keywords: [],
            preferences: {}
          }
        })
      });
      
      if (response.ok) {
        const result = await response.json();
        
        if (result.success) {
          console.log('📊 Weights with Goal:');
          Object.entries(result.weights).forEach(([aspect, weight]) => {
            const percentage = (weight * 100).toFixed(1);
            const bar = '█'.repeat(Math.floor(weight * 10));
            console.log(`   ${aspect.padEnd(12)} ${percentage.padStart(5)}% ${bar}`);
          });
        }
      }
      
    } catch (error) {
      console.log('❌ Goal test failed:', error.message);
    }
  }
  
  console.log('\n✅ Smart Weighting System Test Complete!');
}

// Check if server is running
async function checkServer() {
  try {
    const response = await fetch('http://localhost:3001/api/test-smart-weighting');
    if (response.ok) {
      const info = await response.json();
      console.log('🚀 Server is running!');
      console.log(`System: ${info.system} v${info.version}`);
      console.log('Features:', info.features.join(', '));
      return true;
    }
  } catch (error) {
    console.log('❌ Server not running. Please start the development server first:');
    console.log('   npm run dev');
    return false;
  }
}

// Run the test
async function main() {
  const serverRunning = await checkServer();
  if (serverRunning) {
    await testSmartWeighting();
  }
}

main().catch(console.error); 