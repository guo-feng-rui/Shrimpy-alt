// Test script to compare Keyword-based vs Smart Weighting Systems
const { runComparisonDemo } = require('./src/lib/weighting-comparison.ts');

async function main() {
  console.log('🔍 Starting Weighting System Comparison Test\n');
  
  try {
    await runComparisonDemo();
  } catch (error) {
    console.error('❌ Comparison test failed:', error);
  }
}

main(); 