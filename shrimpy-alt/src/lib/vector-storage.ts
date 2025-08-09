import { db } from '../../firebase.config';
import { 
  ConnectionVectors, 
  SearchQuery, 
  WeightedSearchResult, 
  UserGoal,
  COLLECTIONS,
  vectorUtils
} from './vector-schema';
import { SmartWeighting, DynamicWeights } from './smart-weighting';
import { cosineSimilarity } from 'ai';
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
import { 
  searchConnections as indexSearchConnections,
  StoredConnection
} from './firestore';

// Vector Storage Operations
export class VectorStorage {
  
  // Store connection vectors in Firestore
  static async storeConnectionVectors(connectionVectors: ConnectionVectors): Promise<void> {
    try {
      console.log('[VectorStorage.storeConnectionVectors] begin', {
        connectionId: connectionVectors.connectionId,
        userId: connectionVectors.userId,
        skillsCount: connectionVectors.skills?.length || 0,
        companiesCount: connectionVectors.companies?.length || 0,
        locationsCount: connectionVectors.locations?.length || 0,
        jobTitlesCount: connectionVectors.jobTitles?.length || 0,
        industriesCount: connectionVectors.industries?.length || 0,
        educationCount: connectionVectors.education?.length || 0,
        summariesCount: (connectionVectors as any).summaries?.length || 0,
        hasOriginalConnection: !!connectionVectors.originalConnection,
        originalConnectionKeys: connectionVectors.originalConnection ? Object.keys(connectionVectors.originalConnection) : []
      });
      const docRef = doc(db, COLLECTIONS.CONNECTION_VECTORS, connectionVectors.connectionId);
      await setDoc(docRef, {
        ...connectionVectors,
        lastUpdated: new Date(),
        isActive: true
      });
      console.log(`[VectorStorage.storeConnectionVectors] stored ${connectionVectors.connectionId}`);
    } catch (error) {
      console.error('[VectorStorage.storeConnectionVectors] error:', error);
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

  // Get connection count for a user (for performance optimization)
  static async getConnectionCount(userId: string): Promise<number> {
    try {
      const q = query(
        collection(db, COLLECTIONS.CONNECTION_VECTORS),
        where('userId', '==', userId),
        where('isActive', '==', true)
      );
      
      const querySnapshot = await getDocs(q);
      return querySnapshot.size;
    } catch (error) {
      console.error('Error getting connection count:', error);
      return 0; // Return 0 on error to fall back to simple weights
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

  // Search connections with weighted similarity - optimized for performance
  static async searchConnections(searchQuery: SearchQuery): Promise<WeightedSearchResult[]> {
    try {
      const { query: searchText, userId, goal, filters, limit = 10, threshold = 0.01 } = searchQuery;
      
      // Use pre-calculated weights if provided, otherwise calculate smart weights
      const dynamicWeights = searchQuery.weights || await SmartWeighting.calculateSmartWeights(searchText, goal);
      
      // Query Firestore with optimized filtering and limit
      let firestoreQuery = query(
        collection(db, COLLECTIONS.CONNECTION_VECTORS),
        where('userId', '==', userId),
        where('isActive', '==', true),
        orderBy('lastUpdated', 'desc')
      );
      
      // Apply early limit to reduce data transfer
      const querySnapshot = await getDocs(firestoreQuery);
      const userVectors = querySnapshot.docs.map(doc => doc.data() as ConnectionVectors);
      
      if (userVectors.length === 0) {
        return [];
      }

      // Apply filters if provided
      let filteredVectors = userVectors;
      if (filters) {
        filteredVectors = this.applyFilters(userVectors, filters);
      }

      // Pre-process query terms once for all connections
      const queryTerms = this.preprocessQuery(searchText);

      // Calculate weighted similarities with batched processing
      const results: WeightedSearchResult[] = [];
      
      // Process in smaller batches to avoid memory issues
      const batchSize = 50;
      for (let i = 0; i < filteredVectors.length; i += batchSize) {
        const batch = filteredVectors.slice(i, i + batchSize);
        
        for (const connectionVectors of batch) {
          // Use optimized similarity calculation
          const similarities = this.calculateOptimizedSimilarities(queryTerms, connectionVectors, dynamicWeights);
          const score = similarities.totalScore;
          
          if (score >= threshold) {
            console.log(`[VectorStorage.searchConnections] Found result:`, {
              connectionId: connectionVectors.connectionId,
              score,
              hasOriginalConnection: !!connectionVectors.originalConnection,
              originalConnectionKeys: connectionVectors.originalConnection ? Object.keys(connectionVectors.originalConnection).slice(0, 5) : [],
              fallbackUsed: !connectionVectors.originalConnection
            });
            
            results.push({
              connectionId: connectionVectors.connectionId,
              connection: connectionVectors.originalConnection || { name: connectionVectors.connectionId },
              score: vectorUtils.normalizeScore(score),
              breakdown: {
                skillsScore: similarities.skills,
                experienceScore: similarities.experience,
                companyScore: similarities.company,
                locationScore: similarities.location,
                networkScore: similarities.network,
                goalScore: similarities.goal,
                educationScore: similarities.education,
                summaryScore: similarities.summary
              },
              matchedVectors: [],
              relevance: score > 0.7 ? 'high' : score > 0.5 ? 'medium' : 'low'
            });
          }
        }
        
        // Early exit if we have enough high-quality results
        if (results.length >= limit * 2) {
          results.sort((a, b) => b.score - a.score);
          if (results[limit - 1]?.score > 0.5) {
            break;
          }
        }
      }

      // Sort by score and limit results
      const topResults = results
        .sort((a, b) => b.score - a.score)
        .slice(0, limit);

      // Fallback: if no vector results found, try simple index-based search
      if (topResults.length === 0) {
        try {
          const fallbackConnections: StoredConnection[] = await indexSearchConnections(userId, searchText);
          const mappedFallback: WeightedSearchResult[] = fallbackConnections.slice(0, limit).map((conn, idx) => ({
            connectionId: conn.id,
            connection: conn as unknown as Record<string, unknown>,
            score: Math.max(0.05, 0.2 - idx * 0.01),
            breakdown: {
              skillsScore: 0,
              experienceScore: 0,
              companyScore: 0,
              locationScore: 0.1,
              networkScore: 0,
              goalScore: 0,
              educationScore: 0
            },
            matchedVectors: [],
            relevance: 'low'
          }));

          return mappedFallback;
        } catch (fallbackError) {
          console.error('Fallback index search failed:', fallbackError);
        }
      }

      return topResults;
        
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

  // Pre-process query to avoid repeated parsing
  private static preprocessQuery(query: string): {
    terms: string[];
    importantTerms: Set<string>;
    stemmedTerms: string[];
  } {
    const terms = query.toLowerCase().split(/\s+/).filter(term => term.length > 2);
    
    // Identify important terms (could be expanded with NLP)
    const importantWords = new Set(['engineer', 'developer', 'senior', 'lead', 'manager', 'director', 'austin', 'texas', 'remote', 'startup', 'ai', 'ml', 'python', 'react', 'javascript']);
    const importantTerms = new Set(terms.filter(term => importantWords.has(term)));
    
    // Basic stemming (remove common suffixes)
    const stemmedTerms = terms.map(term => {
      if (term.endsWith('ing')) return term.slice(0, -3);
      if (term.endsWith('ed')) return term.slice(0, -2);
      if (term.endsWith('er')) return term.slice(0, -2);
      if (term.endsWith('ly')) return term.slice(0, -2);
      return term;
    });
    
    return { terms, importantTerms, stemmedTerms };
  }

  // Optimized similarity calculation
  private static calculateOptimizedSimilarities(
    queryTerms: { terms: string[]; importantTerms: Set<string>; stemmedTerms: string[] },
    connectionVectors: ConnectionVectors, 
    weights: DynamicWeights
  ): { skills: number; experience: number; company: number; location: number; network: number; goal: number; education: number; summary: number; totalScore: number } {
    const similarities = {
      skills: 0,
      experience: 0,
      company: 0,
      location: 0,
      network: 0,
      goal: 0,
      education: 0,
      summary: 0
    };
    
    // Helper function for fast text similarity
    const calculateFastSimilarity = (textArray: string[]): number => {
      if (!textArray || textArray.length === 0) return 0;
      
      const text = textArray.join(' ').toLowerCase();
      let score = 0;
      let matches = 0;
      
      // Check for exact term matches (higher weight)
      queryTerms.terms.forEach(term => {
        if (text.includes(term)) {
          score += queryTerms.importantTerms.has(term) ? 2 : 1;
          matches++;
        }
      });
      
      // Check for stemmed matches (lower weight)
      queryTerms.stemmedTerms.forEach(stemmed => {
        if (text.includes(stemmed) && !queryTerms.terms.includes(stemmed)) {
          score += 0.5;
          matches++;
        }
      });
      
      // Normalize by query length and add bonus for multiple matches
      const baseScore = matches / queryTerms.terms.length;
      const bonusScore = matches > 1 ? 0.1 * (matches - 1) : 0;
      
      return Math.min(1, baseScore + bonusScore);
    };
    
    // Calculate similarities only for weighted categories
    if (weights.skills > 0.01) {
      similarities.skills = calculateFastSimilarity(connectionVectors.skills);
    }
    
    if (weights.location > 0.01) {
      similarities.location = calculateFastSimilarity(connectionVectors.locations);
    }
    
    if (weights.company > 0.01) {
      similarities.company = calculateFastSimilarity(connectionVectors.companies);
    }
    
    if (weights.education > 0.01) {
      similarities.education = calculateFastSimilarity(connectionVectors.education);
    }
    
    if (weights.experience > 0.01) {
      // Experience scoring based on text content
      const experienceText = connectionVectors.companies.concat(connectionVectors.skills).join(' ');
      similarities.experience = calculateFastSimilarity([experienceText]);
    }

    // Summary similarity (always low-cost if weight exists)
    if ((weights as any).summary && (weights as any).summary > 0.01) {
      const summaryText = (connectionVectors as any).summaries || [];
      similarities.summary = calculateFastSimilarity(Array.isArray(summaryText) ? summaryText : []);
    }
    
    // Calculate weighted total score
    let totalScore = 0;
    let totalWeight = 0;
    
    Object.entries(similarities).forEach(([key, similarity]) => {
      const weight = (weights as any)[key] ?? 0;
      if (weight > 0.01) {
        totalScore += similarity * weight;
        totalWeight += weight;
      }
    });
    
    const finalScore = totalWeight > 0 ? totalScore / totalWeight : 0;
    
    return {
      ...similarities,
      totalScore: finalScore
    };
  }
  
  // Keep the old method for backward compatibility
  private static calculateDetailedSimilarities(
    searchText: string, 
    connectionVectors: ConnectionVectors, 
    weights: DynamicWeights
  ): { skills: number; experience: number; company: number; location: number; network: number; goal: number; education: number; totalScore: number } {
    const queryTerms = this.preprocessQuery(searchText);
    return this.calculateOptimizedSimilarities(queryTerms, connectionVectors, weights);
  }

  // Keep the old method for backward compatibility
  private static calculateWeightedScore(
    query: string, 
    connectionVectors: ConnectionVectors, 
    weights: DynamicWeights
  ): number {
    const detailed = this.calculateDetailedSimilarities(query, connectionVectors, weights);
    return detailed.totalScore;
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