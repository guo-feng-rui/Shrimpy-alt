import { NextRequest, NextResponse } from 'next/server';
import { createAzure } from '@ai-sdk/azure';
import { streamText } from 'ai';

const azure = createAzure({
  resourceName: process.env.AZURE_RESOURCE_NAME || 'shrimpy-dev-tmp-resource',
  apiKey: process.env.AZURE_OPENAI_API_KEY,
});

export interface SearchIntent {
  isSearchQuery: boolean;
  confidence: number;
  reason: string;
  searchQuery?: string;
}

export async function POST(req: NextRequest) {
  try {
    console.log('🤖 Intent API called');
    const { message } = await req.json();
    console.log('🤖 Message received:', message);

    if (!message || typeof message !== 'string') {
      console.log('🤖 Invalid message format');
      return NextResponse.json({ 
        error: 'Invalid message format',
        message: 'Message must be a non-empty string'
      }, { status: 400 });
    }

    // Check if Azure OpenAI is configured
    console.log('🤖 Checking Azure OpenAI config...');
    console.log('🤖 AZURE_OPENAI_API_KEY exists:', !!process.env.AZURE_OPENAI_API_KEY);
    console.log('🤖 AZURE_RESOURCE_NAME exists:', !!process.env.AZURE_RESOURCE_NAME);
    console.log('🤖 AZURE_OPENAI_DEPLOYMENT_NAME exists:', !!process.env.AZURE_OPENAI_DEPLOYMENT_NAME);
    
    if (!process.env.AZURE_OPENAI_API_KEY || !process.env.AZURE_RESOURCE_NAME) {
      console.warn('🤖 Azure OpenAI not configured, defaulting to chat');
      return NextResponse.json({
        success: true,
        intent: {
          isSearchQuery: false,
          confidence: 0.3,
          reason: 'Azure OpenAI not configured, defaulting to chat',
          searchQuery: undefined
        }
      });
    }

    // Simple keyword-based intent classification for now (faster than AI)
    console.log('🤖 Using simple keyword-based classification...');
    
    const searchKeywords = [
      'need', 'looking', 'find', 'hire', 'recruit', 'connect', 'network',
      'engineer', 'developer', 'designer', 'scientist', 'developer',
      'react', 'python', 'javascript', 'java', 'ml', 'ai', 'data',
      'austin', 'taiwan', 'san francisco', 'new york', 'london',
      'frontend', 'backend', 'fullstack', 'mobile', 'web'
    ];
    
    const chatKeywords = [
      'hi', 'hello', 'hey', 'how are you', 'what is', 'how do i',
      'help', 'thanks', 'thank you', 'goodbye', 'bye', 'app', 'feature'
    ];
    
    const lowerMessage = message.toLowerCase();
    let searchScore = 0;
    let chatScore = 0;
    
    // Check for search keywords
    for (const keyword of searchKeywords) {
      if (lowerMessage.includes(keyword)) {
        searchScore += 1;
      }
    }
    
    // Check for chat keywords
    for (const keyword of chatKeywords) {
      if (lowerMessage.includes(keyword)) {
        chatScore += 1;
      }
    }
    
    // Determine intent
    const isSearchQuery = searchScore > chatScore;
    const confidence = Math.min(0.9, Math.max(0.3, Math.abs(searchScore - chatScore) / 5));
    
    const intent: SearchIntent = {
      isSearchQuery,
      confidence,
      reason: isSearchQuery 
        ? `Found ${searchScore} search keywords vs ${chatScore} chat keywords`
        : `Found ${chatScore} chat keywords vs ${searchScore} search keywords`,
      searchQuery: isSearchQuery ? message : undefined
    };
    
    console.log('🤖 Keyword-based classification result:', intent);

    console.log('🤖 AI Intent Result:', intent);

    return NextResponse.json({ success: true, intent });

  } catch (error) {
    console.error('🤖 AI Intent Classification Error:', error);
    console.error('🤖 Error details:', error instanceof Error ? error.stack : 'No stack trace');
    return NextResponse.json({ 
      error: 'Intent classification failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 