import { db } from '../../firebase.config';
import { 
  ConnectionVectors, 
  SearchQuery, 
  WeightedSearchResult, 
  UserGoal,
  COLLECTIONS,
  vectorUtils,
  DynamicWeights
} from './vector-schema';
import { SmartWeighting } from './smart-weighting';
import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  limit as firestoreLimit,
  writeBatch,
  deleteDoc
} from 'firebase/firestore';

// Vector Storage Operations
export class VectorStorage {
  
  // Store connection vectors in Firestore
  static async storeConnectionVectors(connectionVectors: ConnectionVectors): Promise<void> {
    try {
      const docRef = doc(db, COLLECTIONS.CONNECTION_VECTORS, connectionVectors.connectionId);
      await setDoc(docRef, {
        ...connectionVectors,
        lastUpdated: new Date(),
        isActive: true
      });
      console.log(`Stored vectors for connection: ${connectionVectors.connectionId}`);
    } catch (error) {
      console.error('Error storing connection vectors:', error);
      throw error;
    }
  }

  // Store multiple connection vectors in batch
  static async storeConnectionVectorsBatch(connectionVectors: ConnectionVectors[]): Promise<void> {
    try {
      const batch = writeBatch(db);
      
      connectionVectors.forEach(vectors => {
        const docRef = doc(db, COLLECTIONS.CONNECTION_VECTORS, vectors.connectionId);
        batch.set(docRef, {
          ...vectors,
          lastUpdated: new Date(),
          isActive: true
        });
      });
      
      await batch.commit();
      console.log(`Stored ${connectionVectors.length} connection vectors in batch`);
    } catch (error) {
      console.error('Error storing connection vectors in batch:', error);
      throw error;
    }
  }

  // Get connection vectors by ID
  static async getConnectionVectors(connectionId: string): Promise<ConnectionVectors | null> {
    try {
      const docRef = doc(db, COLLECTIONS.CONNECTION_VECTORS, connectionId);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        return docSnap.data() as ConnectionVectors;
      }
      return null;
    } catch (error) {
      console.error('Error getting connection vectors:', error);
      throw error;
    }
  }

  // Get all connection vectors for a user
  static async getUserConnectionVectors(userId: string): Promise<ConnectionVectors[]> {
    try {
      const q = query(
        collection(db, COLLECTIONS.CONNECTION_VECTORS),
        where('userId', '==', userId),
        where('isActive', '==', true),
        orderBy('lastUpdated', 'desc')
      );
      
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => doc.data() as ConnectionVectors);
    } catch (error) {
      console.error('Error getting user connection vectors:', error);
      throw error;
    }
  }

  // Delete connection vectors
  static async deleteConnectionVectors(connectionId: string): Promise<void> {
    try {
      const docRef = doc(db, COLLECTIONS.CONNECTION_VECTORS, connectionId);
      await deleteDoc(docRef);
      console.log(`Deleted vectors for connection: ${connectionId}`);
    } catch (error) {
      console.error('Error deleting connection vectors:', error);
      throw error;
    }
  }

  // Store user goal
  static async storeUserGoal(userId: string, goal: UserGoal): Promise<void> {
    try {
      const docRef = doc(db, COLLECTIONS.USER_GOALS, userId);
      await setDoc(docRef, {
        ...goal,
        lastUpdated: new Date()
      });
      console.log(`Stored user goal for: ${userId}`);
    } catch (error) {
      console.error('Error storing user goal:', error);
      throw error;
    }
  }

  // Get user goal
  static async getUserGoal(userId: string): Promise<UserGoal | null> {
    try {
      const docRef = doc(db, COLLECTIONS.USER_GOALS, userId);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        return docSnap.data() as UserGoal;
      }
      return null;
    } catch (error) {
      console.error('Error getting user goal:', error);
      throw error;
    }
  }

  // Search connections with weighted similarity
  static async searchConnections(searchQuery: SearchQuery): Promise<WeightedSearchResult[]> {
    try {
      const { query, userId, goal, filters, limit = 10, threshold = 0.3 } = searchQuery;
      
      // Get user's connection vectors
      const userVectors = await this.getUserConnectionVectors(userId);
      
      if (userVectors.length === 0) {
        return [];
      }

      // Apply filters if provided
      let filteredVectors = userVectors;
      if (filters) {
        filteredVectors = this.applyFilters(userVectors, filters);
      }

      // Calculate smart weights using AI-powered analysis
      const dynamicWeights = await SmartWeighting.calculateSmartWeights(query, goal);

      // Calculate weighted similarities
      const results: WeightedSearchResult[] = [];
      
      for (const connectionVectors of filteredVectors) {
        // For now, we'll use a simple approach - in the full implementation,
        // we'd generate embeddings for the query and compare with each vector type
        const score = this.calculateWeightedScore(query, connectionVectors, dynamicWeights);
        
        if (score >= threshold) {
          results.push({
            connectionId: connectionVectors.connectionId,
            connection: connectionVectors.originalConnection,
            score: vectorUtils.normalizeScore(score),
            breakdown: {
              skillsScore: 0, // Will be calculated in full implementation
              experienceScore: 0,
              companyScore: 0,
              locationScore: 0,
              networkScore: 0,
              goalScore: 0,
              educationScore: 0
            },
            matchedVectors: [], // Will be populated in full implementation
            relevance: score > 0.7 ? 'high' : score > 0.5 ? 'medium' : 'low'
          });
        }
      }

      // Sort by score and limit results
      return results
        .sort((a, b) => b.score - a.score)
        .slice(0, limit);
        
    } catch (error) {
      console.error('Error searching connections:', error);
      throw error;
    }
  }

  // Apply filters to connection vectors
  private static applyFilters(
    vectors: ConnectionVectors[], 
    filters: NonNullable<SearchQuery['filters']>
  ): ConnectionVectors[] {
    return vectors.filter(vectors => {
      // Skills filter
      if (filters.skills && filters.skills.length > 0) {
        const hasMatchingSkill = filters.skills.some(skill => 
          vectors.skills.some(connectionSkill => 
            connectionSkill.toLowerCase().includes(skill.toLowerCase())
          )
        );
        if (!hasMatchingSkill) return false;
      }

      // Companies filter
      if (filters.companies && filters.companies.length > 0) {
        const hasMatchingCompany = filters.companies.some(company => 
          vectors.companies.some(connectionCompany => 
            connectionCompany.toLowerCase().includes(company.toLowerCase())
          )
        );
        if (!hasMatchingCompany) return false;
      }

      // Locations filter
      if (filters.locations && filters.locations.length > 0) {
        const hasMatchingLocation = filters.locations.some(location => 
          vectors.locations.some(connectionLocation => 
            connectionLocation.toLowerCase().includes(location.toLowerCase())
          )
        );
        if (!hasMatchingLocation) return false;
      }

      // Industries filter
      if (filters.industries && filters.industries.length > 0) {
        const hasMatchingIndustry = filters.industries.some(industry => 
          vectors.industries.some(connectionIndustry => 
            connectionIndustry.toLowerCase().includes(industry.toLowerCase())
          )
        );
        if (!hasMatchingIndustry) return false;
      }

      return true;
    });
  }

  // Calculate weighted score (placeholder for now)
  private static calculateWeightedScore(
    query: string, 
    connectionVectors: ConnectionVectors, 
    weights: DynamicWeights
  ): number {
    // This is a placeholder - in the full implementation, we'd:
    // 1. Generate embeddings for the query
    // 2. Compare with each vector type
    // 3. Apply weights and return weighted score
    
    // For now, return a simple score based on text matching
    const queryLower = query.toLowerCase();
    let score = 0;
    
    // Simple text matching for demonstration
    if (connectionVectors.skills.some(skill => skill.toLowerCase().includes(queryLower))) {
      score += weights.skills;
    }
    if (connectionVectors.companies.some(company => company.toLowerCase().includes(queryLower))) {
      score += weights.company;
    }
    if (connectionVectors.locations.some(location => location.toLowerCase().includes(queryLower))) {
      score += weights.location;
    }
    if (connectionVectors.education.some(edu => edu.toLowerCase().includes(queryLower))) {
      score += weights.education;
    }
    
    return score;
  }

  // Get search statistics
  static async getSearchStats(userId: string): Promise<{
    totalConnections: number;
    totalVectors: number;
    lastUpdated: Date | null;
  }> {
    try {
      const userVectors = await this.getUserConnectionVectors(userId);
      
      return {
        totalConnections: userVectors.length,
        totalVectors: userVectors.length * 6, // 6 vectors per connection
        lastUpdated: userVectors.length > 0 ? userVectors[0].lastUpdated : null
      };
    } catch (error) {
      console.error('Error getting search stats:', error);
      throw error;
    }
  }
} 