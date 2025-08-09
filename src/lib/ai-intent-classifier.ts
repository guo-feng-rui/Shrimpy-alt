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

export class AIIntentClassifier {
  static async classifyIntent(message: string): Promise<SearchIntent> {
    try {
      const prompt = `You are an intelligent assistant that determines if a user wants to search for professional connections or just have a regular conversation.

Analyze the user's message and determine their intent:

**SEARCH QUERIES** (should trigger search):
- Looking for specific people, skills, or roles
- Hiring, recruiting, or finding talent
- Networking or connecting with professionals
- Job-related searches (developers, engineers, designers, etc.)
- Location-based searches (people in Austin, Taiwan, etc.)
- Skill-based searches (React, Python, ML, etc.)

**CHAT QUERIES** (should NOT trigger search):
- General greetings (Hi, Hello, How are you?)
- Questions about the app or features
- General conversation or small talk
- Help requests or instructions
- Thank you messages
- Goodbye messages

**EXAMPLES:**
- "Need ML engineers in Austin" → SEARCH
- "Looking for React developers" → SEARCH
- "Find Python developers in Taiwan" → SEARCH
- "Hi" → CHAT
- "How are you?" → CHAT
- "What is this app?" → CHAT
- "How do I upload data?" → CHAT

Respond with a JSON object:
{
  "isSearchQuery": true/false,
  "confidence": 0.0-1.0,
  "reason": "brief explanation",
  "searchQuery": "extracted search terms if applicable"
}

User message: "${message}"`;

      const result = await streamText({
        model: azure(process.env.AZURE_OPENAI_DEPLOYMENT_NAME || 'gpt-4o'),
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.1,
      });

      const responseText = await result.text;
      console.log('🤖 AI Response:', responseText);

      // Parse the JSON response
      let intent: SearchIntent;
      try {
        intent = JSON.parse(responseText.trim());
      } catch (error) {
        console.error('Failed to parse AI response:', responseText);
        // Fallback to conservative approach
        intent = {
          isSearchQuery: false,
          confidence: 0.3,
          reason: 'Failed to parse AI response, defaulting to chat',
          searchQuery: undefined
        };
      }

      console.log('🤖 AI Intent Classification:', {
        message,
        intent,
        aiResponse: responseText
      });

      return intent;

    } catch (error) {
      console.error('Error in AI intent classification:', error);
      // Fallback to conservative approach
      return {
        isSearchQuery: false,
        confidence: 0.3,
        reason: 'AI classification failed, defaulting to chat',
        searchQuery: undefined
      };
    }
  }
} 