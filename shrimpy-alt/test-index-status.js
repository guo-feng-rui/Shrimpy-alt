import { IndexTracker } from './src/lib/index-tracker.ts';

async function checkIndexStatus() {
  console.log('🔍 Checking Firestore Index Status...\n');
  
  try {
    const detailedStatus = await IndexTracker.getDetailedStatus();
    
    console.log('📊 Index Status:');
    console.log(`   Building: ${detailedStatus.status.isBuilding ? 'Yes' : 'No'}`);
    console.log(`   Progress: ${detailedStatus.progress}`);
    console.log(`   Last Checked: ${detailedStatus.status.lastChecked}`);
    
    if (detailedStatus.status.error) {
      console.log(`   Error: ${detailedStatus.status.error}`);
    }
    
    if (detailedStatus.status.estimatedCompletion) {
      console.log(`   Estimated Completion: ${detailedStatus.status.estimatedCompletion}`);
    }
    
    console.log('\n💡 Recommendations:');
    detailedStatus.recommendations.forEach(rec => {
      console.log(`   ${rec}`);
    });
    
    if (detailedStatus.status.isBuilding) {
      console.log('\n⏳ Would you like to wait for the index to complete? (y/n)');
      // In a real scenario, you'd handle user input here
      console.log('   Run: node test-index-status.js --wait');
    }
    
  } catch (error) {
    console.error('❌ Failed to check index status:', error);
  }
}

async function waitForIndex() {
  console.log('⏳ Waiting for index to be ready...\n');
  
  try {
    const isReady = await IndexTracker.waitForIndex();
    
    if (isReady) {
      console.log('✅ Index is ready! You can now test semantic search.');
    } else {
      console.log('❌ Index building timeout reached. Please check Firebase Console.');
    }
    
  } catch (error) {
    console.error('❌ Error waiting for index:', error);
  }
}

// Parse command line arguments
const args = process.argv.slice(2);
const shouldWait = args.includes('--wait');

if (shouldWait) {
  waitForIndex();
} else {
  checkIndexStatus();
} 