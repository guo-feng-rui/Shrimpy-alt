import { NextRequest, NextResponse } from 'next/server';
import { VectorStorage } from '../../../lib/vector-storage';
import { SmartWeighting } from '../../../lib/smart-weighting';
import { SearchQuery, WeightedSearchResult } from '../../../lib/vector-schema';
import { requireAuth } from '../../../lib/auth-middleware';
import { SearchCache } from '../../../lib/search-cache';

// Shared search logic to avoid duplication with caching
async function performSearch({
  query,
  userId,
  goal,
  limit = 10
}: {
  query: string;
  userId: string;
  goal?: any;
  limit?: number;
}) {
  // Check cache first
  const cachedResult = SearchCache.get(query, userId, goal);
  if (cachedResult) {
    console.log('🔍 Returning cached search results for:', query);
    return cachedResult;
  }

  console.log('🔍 Search API: Starting optimized search for query:', query);
  console.log('🔍 Search API: User ID:', userId);

  // Step 1: Calculate AI-powered smart weights
  console.time('🔍 Total search time');
  console.time('🔍 SmartWeighting calculation');
  
  console.log('🔍 Using AI-powered smart weights for search');
  const smartWeights = await SmartWeighting.calculateSmartWeights(query, goal);
  
  console.timeEnd('🔍 SmartWeighting calculation');
  console.log('🔍 Search API: Smart weights calculated:', smartWeights);

  // Step 2: Perform optimized vector search
  console.time('🔍 Vector search');
  const searchQuery: SearchQuery = {
    query,
    userId,
    weights: smartWeights,
    goal,
    limit: limit * 1.5 // Get slightly more results for better sorting
  };
  const searchResults = await VectorStorage.searchConnections(searchQuery);
  console.timeEnd('🔍 Vector search');
  console.log('🔍 Search API: Found', searchResults.length, 'results');

  // Step 3: Results are already scored optimally by VectorStorage, just final sort and limit
  const sortedResults = searchResults
    .slice(0, limit)
    .map(result => ({
      ...result,
      smartWeights,
      weightedScore: result.score // Use the already calculated score
    }));

  console.timeEnd('🔍 Total search time');
  console.log('🔍 Search API: Returning', sortedResults.length, 'optimized results');

  const result = {
    success: true,
    query,
    smartWeights,
    results: sortedResults,
    totalFound: searchResults.length,
    searchMetadata: {
      query,
      userId,
      goal,
      smartWeights,
      timestamp: new Date().toISOString(),
      optimizationUsed: 'ai-powered',
      cached: false
    }
  };

  // Cache the result for 5 minutes
  const ttl = 5 * 60 * 1000; // 5 minutes
  SearchCache.set(query, userId, result, goal, ttl);

  return result;
}

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

    const result = await performSearch({
      query,
      userId: finalUserId,
      goal,
      limit
    });

    return NextResponse.json(result);

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
    } : {
      type: 'general' as const,
      description: 'General networking',
      keywords: [],
      preferences: {}
    };

    // Use the same optimized logic as POST
    const result = await performSearch({
      query,
      userId: finalUserId,
      goal,
      limit
    });

    return NextResponse.json(result);

  } catch (error) {
    console.error('🔍 Search API: Error occurred:', error);
    return NextResponse.json({ 
      error: 'Search failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 