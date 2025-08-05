import { createAzure } from '@ai-sdk/azure';
import { streamText } from 'ai';
import { NextRequest, NextResponse } from 'next/server';

const azure = createAzure({
  resourceName: process.env.AZURE_RESOURCE_NAME || 'shrimpy-dev-tmp-resource',
  apiKey: process.env.AZURE_OPENAI_API_KEY,
});

export async function POST(req: NextRequest) {
  try {
    const { message, userId } = await req.json();

    if (!message || !userId) {
      return NextResponse.json({ 
        error: 'Message and user ID are required' 
      }, { status: 400 });
    }

    const isAzureConfigured = !!(
      process.env.AZURE_OPENAI_API_KEY &&
      process.env.AZURE_RESOURCE_NAME &&
      process.env.AZURE_OPENAI_DEPLOYMENT_NAME
    );

    if (!isAzureConfigured) {
      return NextResponse.json({
        error: 'Azure OpenAI not configured',
        fallback: {
          goal: {
            type: 'general',
            description: 'General networking',
            keywords: [],
            preferences: {}
          },
          confidence: 0.5
        }
      }, { status: 200 });
    }

    const result = await streamText({
      model: azure(process.env.AZURE_OPENAI_DEPLOYMENT_NAME || 'gpt-4o'),
      system: `You are an expert at classifying professional networking goals from chat messages.

Analyze the user's message and classify their primary goal into one of these categories:

1. job_search - Looking for job opportunities, career transitions, employment
2. startup_building - Building startups, finding co-founders, entrepreneurship
3. mentorship - Seeking guidance, advice, mentorship relationships
4. skill_development - Learning new skills, professional development
5. industry_networking - Industry connections, professional networking
6. general - General networking, casual connections

For each goal type, provide:
- type: The goal category
- description: A brief description of the goal
- keywords: Relevant keywords for this goal
- preferences: Any specific preferences mentioned

Return ONLY a valid JSON object with this structure:
{
  "goal": {
    "type": "goal_category",
    "description": "Goal description",
    "keywords": ["keyword1", "keyword2"],
    "preferences": {}
  },
  "confidence": 0.0-1.0,
  "reasoning": "Brief explanation of classification"
}`,
      messages: [
        {
          role: 'user',
          content: `Classify the goal in this professional networking message: "${message}"`
        }
      ],
      temperature: 0.1
    });

    let responseText = '';
    for await (const chunk of result.textStream) {
      responseText += chunk;
    }

    let classification;
    try {
      classification = JSON.parse(responseText);
    } catch (error) {
      console.error('Failed to parse goal classification:', responseText);
      return NextResponse.json({
        error: 'Failed to parse goal classification',
        fallback: {
          goal: {
            type: 'general',
            description: 'General networking',
            keywords: [],
            preferences: {}
          },
          confidence: 0.5,
          reasoning: 'Fallback classification due to parsing error'
        }
      }, { status: 200 });
    }

    return NextResponse.json({
      success: true,
      classification,
      message,
      userId,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Goal classification failed:', error);
    return NextResponse.json({ 
      error: 'Goal classification failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 