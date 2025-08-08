import { NextRequest } from 'next/server';

export interface AuthenticatedRequest extends NextRequest {
  userId?: string;
  isAuthenticated?: boolean;
}

export function extractAuthInfo(req: NextRequest): { userId: string | null; isAuthenticated: boolean } {
  console.log('[auth] extractAuthInfo called');
  const authHeader = req.headers.get('authorization');
  console.log('[auth] header present:', !!authHeader);
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    console.log('[auth] no bearer token');
    return { userId: null, isAuthenticated: false };
  }
  
  const token = authHeader.substring(7); // Remove 'Bearer ' prefix
  console.log('[auth] bearer token received');
  
  // For testing purposes, we'll use a simple token format
  // In production, you'd verify the JWT token with Firebase
  if (token === 'mock-test-token') {
    // Extract user ID from the request body or query params
    const url = new URL(req.url);
    const userId = url.searchParams.get('userId');
    console.log('[auth] mock token ok; userId from query =', userId);
    
    if (userId) {
      return { userId, isAuthenticated: true };
    }
    
    // Try to get from request body (for POST requests)
    // Note: This is a simplified approach for testing
    console.log('[auth] falling back to test-user');
    return { userId: 'test-user', isAuthenticated: true };
  }
  
  console.log('[auth] invalid token');
  return { userId: null, isAuthenticated: false };
}

export function requireAuth(req: NextRequest): { userId: string; isAuthenticated: boolean } {
  const { userId, isAuthenticated } = extractAuthInfo(req);
  
  if (!isAuthenticated || !userId) {
    throw new Error('Authentication required');
  }
  
  return { userId, isAuthenticated };
} 