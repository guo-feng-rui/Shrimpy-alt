import { NextRequest, NextResponse } from 'next/server';
import { VectorStorage } from '../../../lib/vector-storage';
import { SmartWeighting } from '../../../lib/smart-weighting';
import { SearchQuery, WeightedSearchResult } from '../../../lib/vector-schema';
import { requireAuth } from '../../../lib/auth-middleware';

export async function POST(req: NextRequest) {
  try {
    // Authenticate the request
    const { userId: authUserId } = requireAuth(req);
    
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

    // Step 1: Calculate smart weights using our LLM-based system
    const smartWeights = await SmartWeighting.calculateSmartWeights(query, goal);
    console.log('🔍 Search API: Smart weights calculated:', smartWeights);

    // Step 2: Perform weighted vector search
    const searchQuery: SearchQuery = {
      query,
      userId: finalUserId,
      goal,
      limit: limit
    };
    const searchResults = await VectorStorage.searchConnections(searchQuery);
    console.log('🔍 Search API: Found', searchResults.length, 'results');

    // Step 3: Apply smart weighting to results
    const weightedResults = searchResults.map((result: WeightedSearchResult) => {
      // Calculate weighted score using smart weights
      const weightedScore = 
        (result.breakdown.skillsScore * smartWeights.skills) +
        (result.breakdown.experienceScore * smartWeights.experience) +
        (result.breakdown.companyScore * smartWeights.company) +
        (result.breakdown.locationScore * smartWeights.location) +
        (result.breakdown.networkScore * smartWeights.network) +
        (result.breakdown.goalScore * smartWeights.goal) +
        (result.breakdown.educationScore * smartWeights.education);

      return {
        ...result,
        weightedScore,
        smartWeights,
        relevanceBreakdown: {
          skills: result.breakdown.skillsScore * smartWeights.skills,
          experience: result.breakdown.experienceScore * smartWeights.experience,
          company: result.breakdown.companyScore * smartWeights.company,
          location: result.breakdown.locationScore * smartWeights.location,
          network: result.breakdown.networkScore * smartWeights.network,
          goal: result.breakdown.goalScore * smartWeights.goal,
          education: result.breakdown.educationScore * smartWeights.education
        }
      };
    });

    // Step 4: Sort by weighted score and limit results
    const sortedResults = weightedResults
      .sort((a, b) => b.weightedScore - a.weightedScore)
      .slice(0, limit);

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
      const weightedScore = 
        (result.breakdown.skillsScore * smartWeights.skills) +
        (result.breakdown.experienceScore * smartWeights.experience) +
        (result.breakdown.companyScore * smartWeights.company) +
        (result.breakdown.locationScore * smartWeights.location) +
        (result.breakdown.networkScore * smartWeights.network) +
        (result.breakdown.goalScore * smartWeights.goal) +
        (result.breakdown.educationScore * smartWeights.education);

      return {
        ...result,
        weightedScore,
        smartWeights,
        relevanceBreakdown: {
          skills: result.breakdown.skillsScore * smartWeights.skills,
          experience: result.breakdown.experienceScore * smartWeights.experience,
          company: result.breakdown.companyScore * smartWeights.company,
          location: result.breakdown.locationScore * smartWeights.location,
          network: result.breakdown.networkScore * smartWeights.network,
          goal: result.breakdown.goalScore * smartWeights.goal,
          education: result.breakdown.educationScore * smartWeights.education
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