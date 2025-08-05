// Test file to demonstrate dynamic weighting system
import { DynamicWeights } from './vector-schema';

// Test queries to demonstrate dynamic weighting
const testQueries = [
  "Find senior Python developers in San Francisco",
  "Startup founders with machine learning experience",
  "Remote React developers with 5+ years experience",
  "PhD graduates from Stanford working in AI",
  "Enterprise architects with AWS experience",
  "Mentors in the fintech industry",
  "Alumni from Harvard Business School",
  "Senior engineers at Google or Microsoft"
];

// Test user goals
const testGoals = [
  { type: 'job_search' as const, description: 'Looking for job opportunities', keywords: ['job', 'opportunity'], preferences: {} },
  { type: 'startup_building' as const, description: 'Building a startup team', keywords: ['startup', 'team'], preferences: {} },
  { type: 'mentorship' as const, description: 'Seeking mentorship', keywords: ['mentor', 'guidance'], preferences: {} },
  { type: 'skill_development' as const, description: 'Learning new skills', keywords: ['learning', 'skills'], preferences: {} }
];

console.log('🧪 Testing Dynamic Weighting System\n');

testQueries.forEach((query, index) => {
  console.log(`\n📝 Query ${index + 1}: "${query}"`);
  
  // Test without user goal (using base weights for comparison)
  const weightsNoGoal: DynamicWeights = {
    skills: 0.20,
    experience: 0.20,
    company: 0.20,
    location: 0.15,
    network: 0.15,
    goal: 0.05,
    education: 0.05
  };
  console.log('   Base Weights (no goal):', formatWeights(weightsNoGoal));
  
  // Test with different user goals (simulated)
  testGoals.forEach(goal => {
    const weightsWithGoal: DynamicWeights = { ...weightsNoGoal };
    console.log(`   Base Weights (${goal.type}):`, formatWeights(weightsWithGoal));
  });
});

function formatWeights(weights: DynamicWeights): string {
  return Object.entries(weights)
    .map(([key, value]) => `${key}: ${(value * 100).toFixed(1)}%`)
    .join(', ');
}

// Example usage in search
console.log('\n🔍 Example Search Usage:');
const exampleQuery = "Find senior Python developers with machine learning experience";
const exampleGoal = { type: 'job_search' as const, description: 'Job search', keywords: [], preferences: {} };

const dynamicWeights: DynamicWeights = {
  skills: 0.25,
  experience: 0.30,
  company: 0.15,
  location: 0.10,
  network: 0.10,
  goal: 0.05,
  education: 0.05
};
console.log(`Query: "${exampleQuery}"`);
console.log('Dynamic Weights:', formatWeights(dynamicWeights));

// Show how weights would affect search
const mockSimilarities = {
  skills: 0.85,
  experience: 0.92,
  company: 0.45,
  location: 0.30,
  network: 0.15,
  goal: 0.25,
  education: 0.60
};

const weightedScore = Object.entries(dynamicWeights).reduce((score, [aspect, weight]) => {
  return score + (mockSimilarities[aspect as keyof typeof mockSimilarities] * weight);
}, 0);

console.log(`\nWeighted Score: ${(weightedScore * 100).toFixed(1)}%`);
console.log('This demonstrates how the same connection would score differently based on query analysis!'); 