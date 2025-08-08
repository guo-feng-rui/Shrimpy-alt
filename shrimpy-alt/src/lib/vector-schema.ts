// Vector Storage Schema for Multi-Vector RAG with Dynamic Weighting

import type { DynamicWeights } from './smart-weighting';

// Re-export DynamicWeights for convenience  
export type { DynamicWeights } from './smart-weighting';

export interface VectorEmbedding {
  vector: number[];  // The actual embedding vector
  dimension: number;  // Vector dimension (e.g., 3072 for text-embedding-3-large)
  model: string;     // Model used (e.g., "text-embedding-3-large")
  timestamp: Date;   // When the embedding was generated
}

export interface ConnectionVectors {
  // Connection metadata
  connectionId: string;
  userId: string;
  originalConnection: Record<string, unknown>; // The original LinkedIn connection data
  
  // Multiple specialized embeddings
  skillsVector: VectorEmbedding;
  experienceVector: VectorEmbedding;
  companyVector: VectorEmbedding;
  locationVector: VectorEmbedding;
  networkVector: VectorEmbedding;
  goalVector: VectorEmbedding;
  educationVector: VectorEmbedding;
  summaryVector: VectorEmbedding;
  
  // Metadata for search optimization
  skills: string[];        // Extracted skills for filtering
  companies: string[];     // Companies for filtering
  locations: string[];     // Locations for filtering
  jobTitles: string[];     // Job titles for filtering
  industries: string[];    // Industries for filtering
  education: string[];     // Education institutions and degrees
  summaries?: string[];    // Profile summaries or about text
  
  // Search metadata
  lastUpdated: Date;
  isActive: boolean;
}

export interface SearchQuery {
  query: string;
  userId: string;
  weights?: DynamicWeights; // Pre-calculated weights to avoid duplicate AI calls
  goal: UserGoal;
  filters?: SearchFilters;
  limit?: number;
  threshold?: number;
}

export interface UserGoal {
  type: 'job_search' | 'startup_building' | 'mentorship' | 'industry_networking' | 'skill_development' | 'general';
  description: string;
  keywords: string[];
  preferences: {
    location?: string[];
    industry?: string[];
    skills?: string[];
    experience_level?: 'entry' | 'mid' | 'senior' | 'executive';
  };
}

export interface SearchFilters {
  skills?: string[];
  companies?: string[];
  locations?: string[];
  industries?: string[];
  experienceLevel?: string[];
  isHiring?: boolean;
  isOpenToWork?: boolean;
}

export interface WeightedSearchResult {
  connectionId: string;
  connection: Record<string, unknown>;
  score: number;
  breakdown: {
    skillsScore: number;
    experienceScore: number;
    companyScore: number;
    locationScore: number;
    networkScore: number;
    goalScore: number;
    educationScore: number;
    summaryScore?: number;
  };
  matchedVectors: string[];
  relevance: 'high' | 'medium' | 'low';
}

// Base weighting configuration (fallback)
export const BASE_WEIGHTS = {
  skills: 0.20,
  experience: 0.20,
  company: 0.20,
  location: 0.15,
  network: 0.15,
  goal: 0.05,
  education: 0.05
} as const;

// Dynamic weight calculation based on real-time user input
// DynamicWeights interface is now defined in smart-weighting.ts to avoid circular imports





// Vector generation prompts for different aspects
export const VECTOR_PROMPTS = {
  skills: "Extract and describe the technical skills, programming languages, tools, and technologies for this professional:",
  experience: "Describe the work experience, job titles, roles, and responsibilities for this professional:",
  company: "Describe the companies, industries, and business context for this professional:",
  location: "Describe the geographic location, cities, countries, and regional context for this professional:",
  network: "Describe the network connections, mutual connections, and relationship strength for this professional:",
  goal: "Describe the career goals, aspirations, interests, and specialties for this professional:",
  education: "Describe the educational background, degrees, universities, and academic achievements for this professional:"
};

// Firestore collection names
export const COLLECTIONS = {
  CONNECTION_VECTORS: 'connection_vectors',
  USER_GOALS: 'user_goals',
  SEARCH_HISTORY: 'search_history'
} as const;

// Utility functions for vector operations
export const vectorUtils = {
  // Calculate cosine similarity between two vectors
  cosineSimilarity: (vecA: number[], vecB: number[]): number => {
    if (vecA.length !== vecB.length) {
      throw new Error('Vectors must have the same dimension');
    }
    
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    
    for (let i = 0; i < vecA.length; i++) {
      dotProduct += vecA[i] * vecB[i];
      normA += vecA[i] * vecA[i];
      normB += vecB[i] * vecB[i];
    }
    
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  },
  
  // Calculate weighted similarity score
  weightedSimilarity: (
    queryVector: number[],
    connectionVectors: ConnectionVectors,
    weights: DynamicWeights
  ): number => {
    const similarities = {
      skills: vectorUtils.cosineSimilarity(queryVector, connectionVectors.skillsVector.vector),
      experience: vectorUtils.cosineSimilarity(queryVector, connectionVectors.experienceVector.vector),
      company: vectorUtils.cosineSimilarity(queryVector, connectionVectors.companyVector.vector),
      location: vectorUtils.cosineSimilarity(queryVector, connectionVectors.locationVector.vector),
      network: vectorUtils.cosineSimilarity(queryVector, connectionVectors.networkVector.vector),
      goal: vectorUtils.cosineSimilarity(queryVector, connectionVectors.goalVector.vector),
      education: vectorUtils.cosineSimilarity(queryVector, connectionVectors.educationVector.vector)
    };
    
    return (
      similarities.skills * weights.skills +
      similarities.experience * weights.experience +
      similarities.company * weights.company +
      similarities.location * weights.location +
      similarities.network * weights.network +
      similarities.goal * weights.goal +
      similarities.education * weights.education
    );
  },
  
  // Normalize scores to 0-1 range
  normalizeScore: (score: number): number => {
    return Math.max(0, Math.min(1, score));
  }
}; 