// Vector Storage Schema for Multi-Vector RAG with Dynamic Weighting

export interface VectorEmbedding {
  vector: number[];  // The actual embedding vector
  dimension: number;  // Vector dimension (e.g., 1536 for text-embedding-ada-002)
  model: string;     // Model used (e.g., "text-embedding-ada-002")
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
  
  // Metadata for search optimization
  skills: string[];        // Extracted skills for filtering
  companies: string[];     // Companies for filtering
  locations: string[];     // Locations for filtering
  jobTitles: string[];     // Job titles for filtering
  industries: string[];    // Industries for filtering
  education: string[];     // Education institutions and degrees
  
  // Search metadata
  lastUpdated: Date;
  isActive: boolean;
}

export interface SearchQuery {
  query: string;
  userId: string;
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
export interface DynamicWeights {
  skills: number;
  experience: number;
  company: number;
  location: number;
  network: number;
  goal: number;
  education: number;
}

// Keywords that indicate different aspects to weight
export const WEIGHT_INDICATORS = {
  skills: [
    'skill', 'technology', 'programming', 'coding', 'development', 'engineering',
    'python', 'javascript', 'react', 'node', 'aws', 'cloud', 'database',
    'frontend', 'backend', 'fullstack', 'mobile', 'ai', 'machine learning',
    'data science', 'analytics', 'design', 'ui', 'ux'
  ],
  experience: [
    'experience', 'senior', 'lead', 'manager', 'director', 'vp', 'cto', 'ceo',
    'years', 'expert', 'specialist', 'architect', 'consultant', 'freelance',
    'contract', 'full-time', 'part-time', 'remote', 'hybrid'
  ],
  company: [
    'company', 'startup', 'enterprise', 'fortune', 'tech', 'fintech', 'healthtech',
    'edtech', 'saas', 'b2b', 'b2c', 'unicorn', 'ipo', 'funding', 'series',
    'google', 'microsoft', 'apple', 'amazon', 'meta', 'netflix'
  ],
  location: [
    'location', 'remote', 'hybrid', 'onsite', 'san francisco', 'new york',
    'seattle', 'austin', 'boston', 'chicago', 'los angeles', 'miami',
    'europe', 'asia', 'canada', 'uk', 'germany', 'france'
  ],
  network: [
    'connection', 'network', 'referral', 'mutual', 'alumni', 'colleague',
    'mentor', 'mentee', 'advisor', 'investor', 'founder', 'co-founder'
  ],
  goal: [
    'career', 'growth', 'opportunity', 'challenge', 'impact', 'mission',
    'passion', 'interest', 'aspiration', 'dream', 'goal', 'objective'
  ],
  education: [
    'education', 'university', 'college', 'degree', 'masters', 'phd', 'mba',
    'bachelor', 'graduate', 'alumni', 'harvard', 'stanford', 'mit', 'berkeley',
    'computer science', 'engineering', 'business', 'economics'
  ]
} as const;

// Calculate dynamic weights based on user query
export function calculateDynamicWeights(query: string, userGoal?: UserGoal): DynamicWeights {
  const queryLower = query.toLowerCase();
  const words = queryLower.split(/\s+/);
  
  // Initialize weights with base values
  const weights: DynamicWeights = { ...BASE_WEIGHTS };
  
  // Count keyword matches for each aspect
  const matches: Record<keyof DynamicWeights, number> = {
    skills: 0,
    experience: 0,
    company: 0,
    location: 0,
    network: 0,
    goal: 0,
    education: 0
  };
  
  // Count matches for each word in the query
  words.forEach(word => {
    Object.entries(WEIGHT_INDICATORS).forEach(([aspect, keywords]) => {
      if (keywords.some(keyword => word.includes(keyword) || keyword.includes(word))) {
        matches[aspect as keyof DynamicWeights]++;
      }
    });
  });
  
  // Calculate total matches
  const totalMatches = Object.values(matches).reduce((sum, count) => sum + count, 0);
  
  if (totalMatches > 0) {
    // Distribute weights based on keyword matches
    Object.keys(weights).forEach(aspect => {
      const aspectKey = aspect as keyof DynamicWeights;
      const matchCount = matches[aspectKey];
      weights[aspectKey] = (matchCount / totalMatches) * 0.8 + (BASE_WEIGHTS[aspectKey] * 0.2);
    });
  }
  
  // Apply user goal adjustments if available
  if (userGoal) {
    const goalAdjustments = getGoalAdjustments(userGoal.type);
    Object.keys(weights).forEach(aspect => {
      const aspectKey = aspect as keyof DynamicWeights;
      const adjustment = goalAdjustments[aspectKey];
      weights[aspectKey] = weights[aspectKey] * (adjustment || 1);
    });
  }
  
  // Normalize weights to sum to 1
  const totalWeight = Object.values(weights).reduce((sum, weight) => sum + weight, 0);
  Object.keys(weights).forEach(aspect => {
    const aspectKey = aspect as keyof DynamicWeights;
    weights[aspectKey] = weights[aspectKey] / totalWeight;
  });
  
  return weights;
}

// Goal-specific adjustments
function getGoalAdjustments(goalType: UserGoal['type']): Partial<DynamicWeights> {
  const adjustments: Record<UserGoal['type'], Partial<DynamicWeights>> = {
    job_search: { experience: 1.5, company: 1.3, skills: 1.2 },
    startup_building: { skills: 1.4, network: 1.3, company: 1.2 },
    mentorship: { experience: 1.6, goal: 1.4, skills: 1.1 },
    industry_networking: { company: 1.6, location: 1.3, network: 1.2 },
    skill_development: { skills: 1.8, education: 1.4, experience: 1.2 },
    general: {}
  };
  
  return adjustments[goalType] || {};
}

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