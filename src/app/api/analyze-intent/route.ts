import { createAzure } from '@ai-sdk/azure';
import { streamText } from 'ai';
import { NextRequest, NextResponse } from 'next/server';

const azure = createAzure({
  resourceName: process.env.AZURE_RESOURCE_NAME || 'shrimpy-dev-tmp-resource',
  apiKey: process.env.AZURE_OPENAI_API_KEY,
});

export async function POST(req: NextRequest) {
  try {
    const { query } = await req.json();
    
    if (!query) {
      return NextResponse.json({ error: 'Query is required' }, { status: 400 });
    }

    // Check if Azure OpenAI is configured
    const isAzureConfigured = !!(
      process.env.AZURE_OPENAI_API_KEY &&
      process.env.AZURE_RESOURCE_NAME &&
      process.env.AZURE_OPENAI_DEPLOYMENT_NAME
    );

    if (!isAzureConfigured) {
      return NextResponse.json({
        error: 'Azure OpenAI not configured',
        fallback: {
          primaryIntent: 'skills',
          secondaryIntents: [
            { intent: 'experience', confidence: 0.6 },
            { intent: 'company', confidence: 0.4 }
          ],
          context: 'Fallback analysis - Azure OpenAI not configured',
          urgency: 'medium',
          specificity: 'general'
        }
      }, { status: 200 });
    }

    // Use Azure OpenAI to analyze intent
    const result = await streamText({
      model: azure(process.env.AZURE_OPENAI_DEPLOYMENT_NAME || 'gpt-4o'),
      system: `You are an expert at analyzing professional networking queries and understanding user intent. 
      
      Analyze the given query and identify the primary and secondary intents across these categories:
      - skills: Technical abilities, technologies, tools, programming languages
      - experience: Work history, seniority, roles, years of experience
      - company: Organizations, industries, business context, company types
      - location: Geographic location, remote work, regional preferences
      - network: Connections, relationships, referrals, networking
      - goal: Career aspirations, interests, objectives, motivations
      - education: Academic background, degrees, institutions, learning
      
      Also analyze:
      - urgency: high/medium/low based on language intensity
      - specificity: specific/general/vague based on query detail
      
      Return ONLY a valid JSON object with this structure:
      {
        "primaryIntent": "skills|experience|company|location|network|goal|education",
        "secondaryIntents": [
          {"intent": "experience", "confidence": 0.8},
          {"intent": "company", "confidence": 0.6}
        ],
        "context": "Brief explanation of the analysis",
        "urgency": "high|medium|low",
        "specificity": "specific|general|vague"
      }`,
      messages: [
        {
          role: 'user',
          content: `Analyze this professional networking query: "${query}"`
        }
      ],
      temperature: 0.1
    });

    // Get the response text
    let responseText = '';
    for await (const chunk of result.textStream) {
      responseText += chunk;
    }

    // Parse the JSON response - handle markdown code blocks
    let analysis;
    try {
      // Clean up the response text - remove markdown code blocks if present
      let cleanResponse = responseText.trim();
      if (cleanResponse.startsWith('```json')) {
        cleanResponse = cleanResponse.replace(/^```json\s*/, '').replace(/\s*```$/, '');
      } else if (cleanResponse.startsWith('```')) {
        cleanResponse = cleanResponse.replace(/^```\s*/, '').replace(/\s*```$/, '');
      }
      
      analysis = JSON.parse(cleanResponse);
    } catch (error) {
      console.error('Failed to parse AI response:', responseText);
      // Return fallback analysis
      analysis = {
        primaryIntent: 'skills',
        secondaryIntents: [
          { intent: 'experience', confidence: 0.6 },
          { intent: 'company', confidence: 0.4 }
        ],
        context: 'Fallback analysis - AI response parsing failed',
        urgency: 'medium',
        specificity: 'general'
      };
    }

    return NextResponse.json({
      success: true,
      analysis,
      query
    });

  } catch (error) {
    console.error('Intent analysis error:', error);
    return NextResponse.json({
      error: 'Failed to analyze intent',
      fallback: {
        primaryIntent: 'skills',
        secondaryIntents: [
          { intent: 'experience', confidence: 0.6 },
          { intent: 'company', confidence: 0.4 }
        ],
        context: 'Fallback analysis - Error occurred',
        urgency: 'medium',
        specificity: 'general'
      }
    }, { status: 500 });
  }
} 