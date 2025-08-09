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
          patterns: {
            skills: 0.1,
            experience: 0.1,
            company: 0.1,
            location: 0.1,
            network: 0.1,
            goal: 0.1,
            education: 0.1
          }
        }
      }, { status: 200 });
    }

    const result = await streamText({
      model: azure(process.env.AZURE_OPENAI_DEPLOYMENT_NAME || 'gpt-4o'),
      system: `You are an expert at analyzing professional networking queries for semantic patterns. 

Analyze the query and identify which aspects are most relevant:
- skills: Technical abilities, technologies, tools, competencies
- experience: Work history, seniority, roles, career progression  
- company: Organizations, industries, business context
- location: Geographic location, remote work, regional preferences
- network: Connections, relationships, referrals, networking
- goal: Career aspirations, interests, objectives
- education: Academic background, degrees, institutions

For each aspect, provide a confidence score from 0.0 to 1.0 based on how strongly it's mentioned or implied.

IMPORTANT: 
- Detect ANY location mentioned (cities, countries, regions) without relying on predefined lists
- Understand context (e.g., "worked in Tokyo" vs "Tokyo Olympics")
- Consider implicit mentions (e.g., "Silicon Valley" implies location)
- Return ONLY a valid JSON object with this structure:
{
  "patterns": {
    "skills": 0.0-1.0,
    "experience": 0.0-1.0, 
    "company": 0.0-1.0,
    "location": 0.0-1.0,
    "network": 0.0-1.0,
    "goal": 0.0-1.0,
    "education": 0.0-1.0
  }
}`,
      messages: [
        {
          role: 'user',
          content: `Analyze this professional networking query for semantic patterns: "${query}"`
        }
      ],
      temperature: 0.1
    });

    let responseText = '';
    for await (const chunk of result.textStream) {
      responseText += chunk;
    }

    let patterns;
    try {
      // Clean up the response text - remove markdown code blocks if present
      let cleanResponse = responseText.trim();
      if (cleanResponse.startsWith('```json')) {
        cleanResponse = cleanResponse.replace(/^```json\s*/, '').replace(/\s*```$/, '');
      } else if (cleanResponse.startsWith('```')) {
        cleanResponse = cleanResponse.replace(/^```\s*/, '').replace(/\s*```$/, '');
      }
      
      patterns = JSON.parse(cleanResponse);
    } catch (error) {
      console.error('Failed to parse LLM response:', responseText);
      return NextResponse.json({
        error: 'Failed to parse LLM response',
        fallback: {
          patterns: {
            skills: 0.1,
            experience: 0.1,
            company: 0.1,
            location: 0.1,
            network: 0.1,
            goal: 0.1,
            education: 0.1
          }
        }
      }, { status: 200 });
    }

    return NextResponse.json({ 
      success: true, 
      patterns: patterns.patterns || patterns,
      query 
    });

  } catch (error) {
    console.error('Pattern analysis failed:', error);
    return NextResponse.json({ 
      error: 'Pattern analysis failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 