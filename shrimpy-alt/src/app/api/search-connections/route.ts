import { NextRequest, NextResponse } from 'next/server';
import { VectorStorage } from '../../../lib/vector-storage';
import { SmartWeighting } from '../../../lib/smart-weighting';
import { SearchQuery, WeightedSearchResult } from '../../../lib/vector-schema';
import { requireAuth } from '../../../lib/auth-middleware';

export async function POST(req: NextRequest) {
  try {
    // Try to authenticate, but allow fallback for testing
    let authUserId = 'test-user';
    try {
      const authResult = requireAuth(req);
      authUserId = authResult.userId;
    } catch (authError) {
      console.log('🔍 Search API: Auth failed, using test user:', authError instanceof Error ? authError.message : String(authError));
    }
    
    const { query, userId, goal, limit = 10 } = await req.json();

    // Use authenticated user ID if not provided in body
    const finalUserId = userId || authUserId;

    if (!query || !finalUserId) {
      return NextResponse.json({ 
        error: 'Query and user ID are required' 
      }, { status: 400 });
    }

    console.log('🔍 Search API: Starting search for query:', query);
    console.log('🔍 Search API: User ID:', finalUserId);
    console.log('🔍 Search API: Goal:', goal);

    // Step 1: Calculate smart weights (optimize for small datasets)
    console.time('🔍 SmartWeighting calculation');
    
    // For small datasets, use simple keyword-based weights to avoid expensive LLM calls
    const connectionCount = await VectorStorage.getConnectionCount(finalUserId);
    let smartWeights;
    
    if (connectionCount <= 10) {
      console.log('🔍 Using lightweight keyword-based weights for small dataset (', connectionCount, 'connections)');
      smartWeights = SmartWeighting.calculateKeywordBasedWeights(query, goal);
    } else {
      console.log('🔍 Using AI-powered smart weights for larger dataset (', connectionCount, 'connections)');
      smartWeights = await SmartWeighting.calculateSmartWeights(query, goal);
    }
    
    console.timeEnd('🔍 SmartWeighting calculation');
    console.log('🔍 Search API: Smart weights calculated:', smartWeights);

    // Step 2: Perform weighted vector search (with pre-calculated weights)
    console.time('🔍 Vector search');
    const searchQuery: SearchQuery = {
      query,
      userId: finalUserId,
      weights: smartWeights, // Pass pre-calculated weights to avoid duplicate AI calls
      goal,
      limit: limit
    };
    const searchResults = await VectorStorage.searchConnections(searchQuery);
    console.timeEnd('🔍 Vector search');
    console.log('🔍 Search API: Found', searchResults.length, 'results');

    // Step 3: Apply smart weighting to results with normalized scoring
    console.time('🔍 Results processing');
    const weightedResults = searchResults.map((result: WeightedSearchResult) => {
      // Normalize individual scores to 0-1 range (assuming they might be small decimals)
      const normalizeScore = (score: number) => Math.min(1, Math.max(0, score * 10)); // Scale up small scores
      
      const normalizedSkills = normalizeScore(result.breakdown.skillsScore);
      const normalizedExperience = normalizeScore(result.breakdown.experienceScore);
      const normalizedCompany = normalizeScore(result.breakdown.companyScore);
      const normalizedLocation = normalizeScore(result.breakdown.locationScore);
      const normalizedNetwork = normalizeScore(result.breakdown.networkScore);
      const normalizedGoal = normalizeScore(result.breakdown.goalScore);
      const normalizedEducation = normalizeScore(result.breakdown.educationScore);
      
      // Calculate weighted score using smart weights and normalized scores
      const weightedScore = 
        (normalizedSkills * smartWeights.skills) +
        (normalizedExperience * smartWeights.experience) +
        (normalizedCompany * smartWeights.company) +
        (normalizedLocation * smartWeights.location) +
        (normalizedNetwork * smartWeights.network) +
        (normalizedGoal * smartWeights.goal) +
        (normalizedEducation * smartWeights.education);

      // Ensure final weighted score is between 0-1
      const finalScore = Math.min(1, Math.max(0, weightedScore));

      return {
        ...result,
        weightedScore: finalScore,
        smartWeights,
        relevanceBreakdown: {
          skills: normalizedSkills * smartWeights.skills,
          experience: normalizedExperience * smartWeights.experience,
          company: normalizedCompany * smartWeights.company,
          location: normalizedLocation * smartWeights.location,
          network: normalizedNetwork * smartWeights.network,
          goal: normalizedGoal * smartWeights.goal,
          education: normalizedEducation * smartWeights.education
        }
      };
    });

    // Step 4: Sort by weighted score and limit results
    const sortedResults = weightedResults
      .sort((a, b) => b.weightedScore - a.weightedScore)
      .slice(0, limit);

    console.timeEnd('🔍 Results processing');
    console.log('🔍 Search API: Returning', sortedResults.length, 'weighted results');

    return NextResponse.json({
      success: true,
      query,
      smartWeights,
      results: sortedResults,
      totalFound: searchResults.length,
      searchMetadata: {
        query,
        userId: finalUserId,
        goal,
        smartWeights,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('🔍 Search API: Error occurred:', error);
    return NextResponse.json({ 
      error: 'Search failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    // Authenticate the request
    const { userId: authUserId } = requireAuth(req);
    
    const { searchParams } = new URL(req.url);
    const query = searchParams.get('q');
    const userId = searchParams.get('userId');
    const goalType = searchParams.get('goal');
    const limit = parseInt(searchParams.get('limit') || '10');

    // Use authenticated user ID if not provided in query params
    const finalUserId = userId || authUserId;

    if (!query || !finalUserId) {
      return NextResponse.json({ 
        error: 'Query (q) and user ID (userId) are required' 
      }, { status: 400 });
    }

    const goal = goalType ? {
      type: goalType as 'job_search' | 'startup_building' | 'mentorship' | 'skill_development' | 'industry_networking' | 'general',
      description: `Goal: ${goalType}`,
      keywords: [],
      preferences: {}
    } : undefined;

    // Use the same logic as POST
    const smartWeights = await SmartWeighting.calculateSmartWeights(query, goal);
    const searchQuery: SearchQuery = {
      query,
      userId: finalUserId,
      goal: goal || {
        type: 'general',
        description: 'General networking',
        keywords: [],
        preferences: {}
      },
      limit: limit
    };
    const searchResults = await VectorStorage.searchConnections(searchQuery);
    
    const weightedResults = searchResults.map((result: WeightedSearchResult) => {
      // Normalize individual scores to 0-1 range (assuming they might be small decimals)
      const normalizeScore = (score: number) => Math.min(1, Math.max(0, score * 10)); // Scale up small scores
      
      const normalizedSkills = normalizeScore(result.breakdown.skillsScore);
      const normalizedExperience = normalizeScore(result.breakdown.experienceScore);
      const normalizedCompany = normalizeScore(result.breakdown.companyScore);
      const normalizedLocation = normalizeScore(result.breakdown.locationScore);
      const normalizedNetwork = normalizeScore(result.breakdown.networkScore);
      const normalizedGoal = normalizeScore(result.breakdown.goalScore);
      const normalizedEducation = normalizeScore(result.breakdown.educationScore);
      
      // Calculate weighted score using smart weights and normalized scores
      const weightedScore = 
        (normalizedSkills * smartWeights.skills) +
        (normalizedExperience * smartWeights.experience) +
        (normalizedCompany * smartWeights.company) +
        (normalizedLocation * smartWeights.location) +
        (normalizedNetwork * smartWeights.network) +
        (normalizedGoal * smartWeights.goal) +
        (normalizedEducation * smartWeights.education);

      // Ensure final weighted score is between 0-1
      const finalScore = Math.min(1, Math.max(0, weightedScore));

      return {
        ...result,
        weightedScore: finalScore,
        smartWeights,
        relevanceBreakdown: {
          skills: normalizedSkills * smartWeights.skills,
          experience: normalizedExperience * smartWeights.experience,
          company: normalizedCompany * smartWeights.company,
          location: normalizedLocation * smartWeights.location,
          network: normalizedNetwork * smartWeights.network,
          goal: normalizedGoal * smartWeights.goal,
          education: normalizedEducation * smartWeights.education
        }
      };
    });

    const sortedResults = weightedResults
      .sort((a, b) => b.weightedScore - a.weightedScore)
      .slice(0, limit);

    return NextResponse.json({
      success: true,
      query,
      smartWeights,
      results: sortedResults,
      totalFound: searchResults.length,
      searchMetadata: {
        query,
        userId: finalUserId,
        goal,
        smartWeights,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('🔍 Search API: Error occurred:', error);
    return NextResponse.json({ 
      error: 'Search failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 