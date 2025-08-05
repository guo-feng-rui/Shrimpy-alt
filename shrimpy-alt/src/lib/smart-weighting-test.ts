// Test file to demonstrate Smart Weighting System
import { SmartWeighting } from './smart-weighting';
import { DynamicWeights } from './vector-schema';

// Test queries that would be difficult for keyword-based systems
const complexQueries = [
  // Ambiguous queries
  "I need someone who can help me scale my business",
  "Looking for a mentor who understands the startup world",
  "Want to connect with people who are passionate about AI",
  
  // Context-dependent queries
  "Need someone with experience in the field",
  "Looking for connections in the industry",
  "Want to find people who can help me grow",
  
  // Implicit intent queries
  "Anyone working on interesting projects?",
  "Who's doing cool stuff in tech?",
  "Looking for people who get things done",
  
  // Multi-faceted queries
  "Need a senior developer who knows cloud and can work remotely",
  "Looking for startup founders with technical backgrounds",
  "Want to connect with experienced professionals in fintech",
  
  // Vague but meaningful queries
  "Someone who can help me figure this out",
  "Looking for guidance on my career path",
  "Want to learn from people who've been there"
];

// Test user goals
const testGoals = [
  { type: 'job_search' as const, description: 'Looking for job opportunities', keywords: ['job', 'opportunity'], preferences: {} },
  { type: 'startup_building' as const, description: 'Building a startup team', keywords: ['startup', 'team'], preferences: {} },
  { type: 'mentorship' as const, description: 'Seeking mentorship', keywords: ['mentor', 'guidance'], preferences: {} },
  { type: 'skill_development' as const, description: 'Learning new skills', keywords: ['learning', 'skills'], preferences: {} }
];

console.log('🧠 Testing Smart Weighting System\n');

async function testSmartWeighting() {
  for (const query of complexQueries) {
    console.log(`\n📝 Query: "${query}"`);
    
    // Test without user goal
    const weightsNoGoal = await SmartWeighting.calculateSmartWeights(query);
    console.log('   Smart Weights (no goal):', formatWeights(weightsNoGoal));
    
    // Test with different user goals
    for (const goal of testGoals) {
      const weightsWithGoal = await SmartWeighting.calculateSmartWeights(query, goal);
      console.log(`   Smart Weights (${goal.type}):`, formatWeights(weightsWithGoal));
    }
  }
  
  // Test specific complex scenarios
  console.log('\n🔍 Complex Scenario Tests:');
  
  const complexScenarios = [
    {
      query: "I'm desperate to find someone who can help me with this urgent project",
      goal: { type: 'job_search' as const, description: 'Urgent job search', keywords: [], preferences: {} }
    },
    {
      query: "Specifically looking for a senior React developer with 5+ years experience",
      goal: { type: 'startup_building' as const, description: 'Building team', keywords: [], preferences: {} }
    },
    {
      query: "Maybe someone who kind of knows about machine learning?",
      goal: { type: 'skill_development' as const, description: 'Learning', keywords: [], preferences: {} }
    }
  ];
  
  for (const scenario of complexScenarios) {
    console.log(`\nScenario: "${scenario.query}"`);
    const weights = await SmartWeighting.calculateSmartWeights(scenario.query, scenario.goal);
    console.log('Smart Weights:', formatWeights(weights));
    
    // Show how the AI would analyze this
    const intentAnalysis = await SmartWeighting.analyzeSemanticIntent(scenario.query);
    console.log('AI Analysis:', {
      primaryIntent: intentAnalysis.primaryIntent,
      urgency: intentAnalysis.urgency,
      specificity: intentAnalysis.specificity,
      context: intentAnalysis.context
    });
  }
}

function formatWeights(weights: DynamicWeights): string {
  return Object.entries(weights)
    .map(([key, value]) => `${key}: ${((value as number) * 100).toFixed(1)}%`)
    .join(', ');
}

// Run the test
testSmartWeighting().catch(console.error);

console.log('\n🎯 Key Advantages of Smart Weighting:');
console.log('1. **AI-Powered Analysis**: Uses Azure OpenAI to understand semantic intent');
console.log('2. **Context Awareness**: Considers urgency, specificity, and complexity');
console.log('3. **Pattern Recognition**: Combines multiple analysis methods');
console.log('4. **Goal Integration**: Adjusts weights based on user objectives');
console.log('5. **Fallback Systems**: Graceful degradation when AI is unavailable');
console.log('6. **Handles Ambiguity**: Better at understanding vague or complex queries'); 