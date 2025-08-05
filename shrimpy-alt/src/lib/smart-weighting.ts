// Smart Weighting System using Semantic Analysis and AI
import { DynamicWeights, UserGoal } from './vector-schema';

// LLM-based semantic analysis categories (for reference only)
export interface SemanticCategory {
  name: keyof DynamicWeights;
  description: string;
}

export const SEMANTIC_CATEGORIES: SemanticCategory[] = [
  {
    name: 'skills',
    description: 'Technical abilities, technologies, tools, and competencies'
  },
  {
    name: 'experience',
    description: 'Work history, seniority, roles, and career progression'
  },
  {
    name: 'company',
    description: 'Organizations, industries, business context, and company types'
  },
  {
    name: 'location',
    description: 'Geographic location, remote work, and regional preferences'
  },
  {
    name: 'network',
    description: 'Connections, relationships, referrals, and networking'
  },
  {
    name: 'goal',
    description: 'Career aspirations, interests, and personal objectives'
  },
  {
    name: 'education',
    description: 'Academic background, degrees, institutions, and learning'
  }
];

// AI-powered intent analysis
export interface IntentAnalysis {
  primaryIntent: keyof DynamicWeights;
  secondaryIntents: Array<{ intent: keyof DynamicWeights; confidence: number }>;
  context: string;
  urgency: 'high' | 'medium' | 'low';
  specificity: 'specific' | 'general' | 'vague';
}

// Smart weight calculation using multiple analysis methods
export class SmartWeighting {
  
  // Method 1: AI-Powered Semantic Intent Analysis
  static async analyzeSemanticIntent(query: string): Promise<IntentAnalysis> {
    try {
      // Call our AI analysis endpoint
      const response = await fetch('/api/analyze-intent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query })
      });
      
      if (!response.ok) {
        throw new Error(`AI analysis failed: ${response.status}`);
      }
      
      const result = await response.json();
      
      if (result.success && result.analysis) {
        return result.analysis as IntentAnalysis;
      } else if (result.fallback) {
        return result.fallback as IntentAnalysis;
      } else {
        throw new Error('No analysis result received');
      }
      
    } catch (error) {
      console.error('AI intent analysis failed:', error);
      // Fallback to simulation
      return this.simulateIntentAnalysis(query);
    }
  }
  
  // Method 2: LLM-Powered Pattern Recognition
  static async detectPatterns(query: string): Promise<Record<keyof DynamicWeights, number>> {
    const patterns: Record<keyof DynamicWeights, number> = {
      skills: 0,
      experience: 0,
      company: 0,
      location: 0,
      network: 0,
      goal: 0,
      education: 0
    };
    
    try {
      // Use LLM to analyze the query for semantic patterns
      const response = await fetch('/api/analyze-patterns', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query })
      });
      
      if (response.ok) {
        const result = await response.json();
        if (result.success && result.patterns) {
          return result.patterns;
        }
      }
    } catch (error) {
      console.error('LLM pattern detection failed:', error);
    }
    
    // Fallback to basic keyword matching for reliability
    return this.fallbackKeywordMatching(query);
  }
  
  // Simple fallback pattern detection (minimal keyword matching)
  private static fallbackKeywordMatching(query: string): Record<keyof DynamicWeights, number> {
    const patterns: Record<keyof DynamicWeights, number> = {
      skills: 0,
      experience: 0,
      company: 0,
      location: 0,
      network: 0,
      goal: 0,
      education: 0
    };
    
    const queryLower = query.toLowerCase();
    
    // Minimal keyword detection as emergency fallback
    if (queryLower.includes('skill') || queryLower.includes('technology') || queryLower.includes('help')) {
      patterns.skills = 0.3;
    }
    if (queryLower.includes('senior') || queryLower.includes('experience') || queryLower.includes('years')) {
      patterns.experience = 0.3;
    }
    if (queryLower.includes('startup') || queryLower.includes('company') || queryLower.includes('business')) {
      patterns.company = 0.3;
    }
    if (queryLower.includes('remote') || queryLower.includes('location') || queryLower.includes('in ')) {
      patterns.location = 0.3;
    }
    if (queryLower.includes('network') || queryLower.includes('connection') || queryLower.includes('alumni')) {
      patterns.network = 0.3;
    }
    if (queryLower.includes('goal') || queryLower.includes('career') || queryLower.includes('opportunity')) {
      patterns.goal = 0.3;
    }
    if (queryLower.includes('education') || queryLower.includes('degree') || queryLower.includes('university')) {
      patterns.education = 0.3;
    }
    
    return patterns;
  }
  
  // Method 3: Contextual Analysis
  static analyzeContext(query: string): {
    urgency: 'high' | 'medium' | 'low';
    specificity: 'specific' | 'general' | 'vague';
    timeSensitivity: boolean;
    complexity: 'simple' | 'moderate' | 'complex';
  } {
    const queryLower = query.toLowerCase();
    
    // Urgency analysis
    const urgencyIndicators = {
      high: ['urgent', 'asap', 'immediately', 'critical', 'emergency', 'desperate'],
      medium: ['soon', 'quickly', 'timely', 'priority'],
      low: ['eventually', 'sometime', 'when possible', 'no rush']
    };
    
    let urgency: 'high' | 'medium' | 'low' = 'low';
    Object.entries(urgencyIndicators).forEach(([level, indicators]) => {
      if (indicators.some(indicator => queryLower.includes(indicator))) {
        urgency = level as 'high' | 'medium' | 'low';
      }
    });
    
    // Specificity analysis
    const specificIndicators = ['exactly', 'specifically', 'precisely', 'particular', 'specific'];
    const vagueIndicators = ['maybe', 'perhaps', 'possibly', 'kind of', 'sort of', 'general'];
    
    let specificity: 'specific' | 'general' | 'vague' = 'general';
    if (specificIndicators.some(indicator => queryLower.includes(indicator))) {
      specificity = 'specific';
    } else if (vagueIndicators.some(indicator => queryLower.includes(indicator))) {
      specificity = 'vague';
    }
    
    // Complexity analysis
    const wordCount = query.split(' ').length;
    const complexity: 'simple' | 'moderate' | 'complex' = 
      wordCount < 5 ? 'simple' : wordCount < 10 ? 'moderate' : 'complex';
    
    return {
      urgency,
      specificity,
      timeSensitivity: urgency !== 'low',
      complexity
    };
  }
  
  // Method 4: Goal-Aware Weighting
  static applyGoalAdjustments(
    baseWeights: DynamicWeights, 
    userGoal: UserGoal,
    context: IntentAnalysis
  ): DynamicWeights {
    const adjustedWeights = { ...baseWeights };
    
    // Goal-specific multipliers
    const goalMultipliers: Record<UserGoal['type'], Partial<DynamicWeights>> = {
      job_search: { experience: 1.4, company: 1.3, skills: 1.2 },
      startup_building: { skills: 1.5, network: 1.4, company: 1.3 },
      mentorship: { experience: 1.6, goal: 1.5, skills: 1.1 },
      industry_networking: { company: 1.6, location: 1.3, network: 1.2 },
      skill_development: { skills: 1.8, education: 1.5, experience: 1.2 },
      general: {}
    };
    
    const multipliers = goalMultipliers[userGoal.type];
    Object.entries(multipliers).forEach(([aspect, multiplier]) => {
      const aspectKey = aspect as keyof DynamicWeights;
      adjustedWeights[aspectKey] = adjustedWeights[aspectKey] * multiplier;
    });
    
    // Context-based adjustments
    if (context.urgency === 'high') {
      // Prioritize more specific aspects for urgent queries
      adjustedWeights.skills *= 1.2;
      adjustedWeights.experience *= 1.2;
    }
    
    if (context.specificity === 'specific') {
      // Boost the primary intent for specific queries
      adjustedWeights[context.primaryIntent] *= 1.3;
    }
    
    return this.normalizeWeights(adjustedWeights);
  }
  
  // Main smart weighting function
  static async calculateSmartWeights(
    query: string, 
    userGoal?: UserGoal
  ): Promise<DynamicWeights> {
    // Step 1: AI-powered intent analysis
    const intentAnalysis = await this.analyzeSemanticIntent(query);
    
    // Step 2: LLM-powered pattern recognition
    const patternWeights = await this.detectPatterns(query);
    
    // Step 3: Contextual analysis
    const context = this.analyzeContext(query);
    
    // Step 4: Combine analyses
    const combinedWeights: DynamicWeights = {
      skills: 0,
      experience: 0,
      company: 0,
      location: 0,
      network: 0,
      goal: 0,
      education: 0
    };
    
    // Weight the different analysis methods
    const aiWeight = 0.6;    // AI analysis gets highest weight
    const patternWeight = 0.3; // Pattern recognition
    const contextWeight = 0.1; // Contextual factors
    
    Object.keys(combinedWeights).forEach(aspect => {
      const aspectKey = aspect as keyof DynamicWeights;
      
      // AI analysis contribution
      const aiContribution = aspectKey === intentAnalysis.primaryIntent ? 0.8 : 0.1;
      
      // Pattern recognition contribution
      const patternContribution = patternWeights[aspectKey];
      
      // Context contribution
      const contextContribution = context.specificity === 'specific' ? 0.2 : 0.1;
      
      combinedWeights[aspectKey] = 
        (aiContribution * aiWeight) +
        (patternContribution * patternWeight) +
        (contextContribution * contextWeight);
    });
    
    // Step 5: Apply goal adjustments if available
    if (userGoal) {
      return this.applyGoalAdjustments(combinedWeights, userGoal, intentAnalysis);
    }
    
    return this.normalizeWeights(combinedWeights);
  }
  
  // Helper: Normalize weights to sum to 1
  private static normalizeWeights(weights: DynamicWeights): DynamicWeights {
    const total = Object.values(weights).reduce((sum, weight) => sum + weight, 0);
    const normalized: DynamicWeights = { ...weights };
    
    Object.keys(normalized).forEach(aspect => {
      const aspectKey = aspect as keyof DynamicWeights;
      normalized[aspectKey] = normalized[aspectKey] / total;
    });
    
    return normalized;
  }
  
  // Simulate AI analysis for demonstration
  private static simulateIntentAnalysis(query: string): IntentAnalysis {
    const queryLower = query.toLowerCase();
    
    // Simple simulation - in real implementation, this would use Azure OpenAI
    let primaryIntent: keyof DynamicWeights = 'skills';
    let confidence = 0.8;
    
    // Basic keyword detection for simulation
    if (queryLower.includes('remote') || queryLower.includes('location') || queryLower.includes('in ')) {
      primaryIntent = 'location';
      confidence = 0.9;
    } else if (queryLower.includes('senior') || queryLower.includes('experience') || queryLower.includes('years')) {
      primaryIntent = 'experience';
      confidence = 0.9;
    } else if (queryLower.includes('startup') || queryLower.includes('company') || queryLower.includes('business')) {
      primaryIntent = 'company';
      confidence = 0.85;
    } else if (queryLower.includes('skill') || queryLower.includes('technology') || queryLower.includes('help')) {
      primaryIntent = 'skills';
      confidence = 0.8;
    }
    
    return {
      primaryIntent,
      secondaryIntents: [
        { intent: 'skills', confidence: 0.6 },
        { intent: 'experience', confidence: 0.4 }
      ],
      context: `Query focuses on ${primaryIntent} with ${confidence * 100}% confidence`,
      urgency: queryLower.includes('urgent') ? 'high' : 'medium',
      specificity: queryLower.includes('specific') ? 'specific' : 'general'
    };
  }
} 