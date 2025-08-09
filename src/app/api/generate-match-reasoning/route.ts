import { NextRequest, NextResponse } from 'next/server';
import { createAzure } from '@ai-sdk/azure';
import { generateText } from 'ai';

const azure = createAzure({
  resourceName: process.env.AZURE_RESOURCE_NAME || 'shrimpy-dev-tmp-resource',
  apiKey: process.env.AZURE_OPENAI_API_KEY,
});

interface GenerateReasoningRequest {
  searchQuery: string;
  connection: Record<string, unknown>;
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
  overallScore: number;
}

export async function POST(req: NextRequest) {
  let requestData: GenerateReasoningRequest | undefined;
  
  try {
    console.log('🤖 Match Reasoning API: Starting request processing');
    
    requestData = await req.json();
    const { searchQuery, connection, breakdown, matchedVectors, overallScore } = requestData;

    // Validate required fields
    if (!searchQuery || !connection || !breakdown) {
      return NextResponse.json({ 
        error: 'Missing required fields: searchQuery, connection, and breakdown are required' 
      }, { status: 400 });
    }

    // Check if Azure OpenAI is configured
    const isAzureConfigured = process.env.AZURE_OPENAI_API_KEY && 
                             process.env.AZURE_RESOURCE_NAME && 
                             process.env.AZURE_OPENAI_DEPLOYMENT_NAME;

    if (!isAzureConfigured) {
      console.log('🤖 Match Reasoning API: Azure OpenAI not configured, returning fallback response');
      return NextResponse.json({
        reasoning: `This connection matches your search for "${searchQuery}" with a ${Math.round(overallScore)}% overall score. Configure Azure OpenAI for detailed AI-generated reasoning.`
      });
    }

    // Extract connection details
    const name = connection.name || connection.firstName || 'this connection';
    const company = connection.company || '';
    const position = connection.position || '';
    const location = connection.location || '';
    const skills = connection.skills || [];
    const summary = connection.summary || connection.about || '';
    
    // Create a structured breakdown of scores for context
    const scoreBreakdown = Object.entries(breakdown)
      .filter(([_, score]) => score > 0.2) // Only include meaningful scores
      .map(([category, score]) => `${category}: ${Math.round(score * 100)}%`)
      .join(', ');

    const strongestAspects = Object.entries(breakdown)
      .filter(([_, score]) => score > 0.4)
      .map(([category, _]) => category)
      .join(', ');

    console.log('🤖 Match Reasoning API: Generating LLM reasoning');

    const result = await generateText({
      model: azure(process.env.AZURE_OPENAI_DEPLOYMENT_NAME || 'gpt-4o'),
      system: `You are an expert networking assistant that explains why specific professional connections are relevant to search queries. 

Your task is to generate a concise, personalized explanation (1-2 sentences) of why this connection matches the user's search. Focus on the most compelling reasons based on the scoring breakdown.

Guidelines:
- Be specific and mention concrete details from the profile
- Highlight the strongest matching aspects (highest scores)
- Use natural, conversational language
- Keep it concise but informative
- Avoid generic statements like "good match" or "relevant experience"
- Focus on actionable networking value`,
      prompt: `Generate a compelling explanation for why this connection matches the search query.

SEARCH QUERY: "${searchQuery}"

CONNECTION PROFILE:
- Name: ${name}
- Position: ${position}
- Company: ${company}
- Location: ${location}
- Skills: ${skills.slice(0, 8).join(', ')}
- Summary: ${summary.slice(0, 200)}

MATCH ANALYSIS:
- Overall Score: ${Math.round(overallScore)}%
- Score Breakdown: ${scoreBreakdown}
- Strongest Aspects: ${strongestAspects}
- Matched Vectors: ${matchedVectors.join(', ')}

Generate a personalized, specific 1-2 sentence explanation of why this connection is valuable for the search query. Focus on the highest-scoring aspects and concrete profile details.`,
    });

    console.log('🤖 Match Reasoning API: LLM reasoning generated successfully');
    
    return NextResponse.json({
      reasoning: result.text.trim()
    });

  } catch (error) {
    console.error('🤖 Match Reasoning API: Error occurred:', error);
    
    // Fallback reasoning if LLM fails
    const { overallScore = 0 } = requestData || {};
    const fallbackReasoning = `This connection matches your search with a ${Math.round(overallScore)}% score based on profile analysis.`;
    
    return NextResponse.json({
      reasoning: fallbackReasoning,
      error: 'AI reasoning generation failed, using fallback',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

export async function OPTIONS(req: NextRequest) {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    }
  });
}
