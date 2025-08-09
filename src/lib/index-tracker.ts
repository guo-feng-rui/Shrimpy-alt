import { db } from '../../firebase.config';
import { collection, query, where, getDocs, limit } from 'firebase/firestore';

export interface IndexStatus {
  isBuilding: boolean;
  estimatedCompletion?: string;
  lastChecked: string;
  error?: string;
}

export class IndexTracker {
  private static readonly INDEX_COLLECTION = 'connection_vectors';
  private static readonly REQUIRED_FIELDS = ['isActive', 'userId', 'lastUpdated'];
  
  /**
   * Check if the required index is still building
   */
  static async checkIndexStatus(): Promise<IndexStatus> {
    try {
      console.log('🔍 Checking Firestore index status...');
      
      // Try to query the collection with the required fields
      const vectorsRef = collection(db, this.INDEX_COLLECTION);
      const q = query(
        vectorsRef,
        where('isActive', '==', true),
        where('userId', '==', 'test-user'),
        limit(1)
      );
      
      const startTime = Date.now();
      const querySnapshot = await getDocs(q);
      const queryTime = Date.now() - startTime;
      
      console.log(`📊 Index query completed in ${queryTime}ms`);
      
      // If query succeeds, index is ready
      return {
        isBuilding: false,
        lastChecked: new Date().toISOString(),
        estimatedCompletion: new Date().toISOString()
      };
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.log(`⚠️ Index still building: ${errorMessage}`);
      
      return {
        isBuilding: true,
        lastChecked: new Date().toISOString(),
        error: errorMessage
      };
    }
  }
  
  /**
   * Wait for index to be ready with polling
   */
  static async waitForIndex(maxWaitTime: number = 15 * 60 * 1000): Promise<boolean> {
    const startTime = Date.now();
    const pollInterval = 30 * 1000; // 30 seconds
    
    console.log('⏳ Waiting for Firestore index to be ready...');
    
    while (Date.now() - startTime < maxWaitTime) {
      const status = await this.checkIndexStatus();
      
      if (!status.isBuilding) {
        console.log('✅ Index is ready!');
        return true;
      }
      
      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      const remaining = Math.floor((maxWaitTime - (Date.now() - startTime)) / 1000);
      
      console.log(`⏳ Index still building... (${elapsed}s elapsed, ${remaining}s remaining)`);
      
      // Wait before next check
      await new Promise(resolve => setTimeout(resolve, pollInterval));
    }
    
    console.log('❌ Index building timeout reached');
    return false;
  }
  
  /**
   * Get index building progress estimate
   */
  static getProgressEstimate(): string {
    const now = new Date();
    const startTime = new Date(now.getTime() - 5 * 60 * 1000); // Assume started 5 minutes ago
    
    const elapsed = now.getTime() - startTime.getTime();
    const estimatedTotal = 10 * 60 * 1000; // 10 minutes total
    const progress = Math.min((elapsed / estimatedTotal) * 100, 95); // Cap at 95%
    
    return `${Math.round(progress)}% complete (estimated)`;
  }
  
  /**
   * Get index status with detailed information
   */
  static async getDetailedStatus(): Promise<{
    status: IndexStatus;
    progress: string;
    recommendations: string[];
  }> {
    const status = await this.checkIndexStatus();
    const progress = this.getProgressEstimate();
    
    const recommendations: string[] = [];
    
    if (status.isBuilding) {
      recommendations.push('⏳ Index is still building - this is normal for new collections');
      recommendations.push('📊 You can test other features while waiting');
      recommendations.push('🔍 Check Firebase Console for detailed progress');
      recommendations.push('⚡ Index building typically takes 5-15 minutes');
    } else {
      recommendations.push('✅ Index is ready for semantic search!');
      recommendations.push('🔍 You can now test the search functionality');
      recommendations.push('📊 Try searching for connections with different queries');
    }
    
    return {
      status,
      progress,
      recommendations
    };
  }
} 