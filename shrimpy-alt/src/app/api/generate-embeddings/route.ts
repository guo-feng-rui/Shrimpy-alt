import { createAzure } from '@ai-sdk/azure';
import { embed, embedMany } from 'ai';
import { NextRequest, NextResponse } from 'next/server';
import { DynamicWeights } from '../../../lib/vector-schema';

const azure = createAzure({
  resourceName: process.env.AZURE_RESOURCE_NAME || 'shrimpy-dev-tmp-resource',
  apiKey: process.env.AZURE_OPENAI_API_KEY,
});

export async function POST(req: NextRequest) {
  try {
    const { connectionData, userId } = await req.json();

    if (!connectionData || !userId) {
      return NextResponse.json({ 
        error: 'Connection data and user ID are required' 
      }, { status: 400 });
    }

    const isAzureConfigured = !!(
      process.env.AZURE_OPENAI_API_KEY &&
      process.env.AZURE_RESOURCE_NAME &&
      process.env.AZURE_OPENAI_DEPLOYMENT_NAME
    );

    if (!isAzureConfigured) {
      return NextResponse.json({
        error: 'Azure OpenAI not configured for embeddings',
        fallback: { success: false, message: 'Azure not configured' }
      }, { status: 200 });
    }

    // Generate embeddings for each vector type
    const embeddings: Record<keyof DynamicWeights, number[]> = {
      skills: [],
      experience: [],
      company: [],
      location: [],
      network: [],
      goal: [],
      education: []
    };

    // Collect all texts for batch processing
    const textsToEmbed: { text: string; type: keyof DynamicWeights }[] = [];

    // Skills embedding
    if (connectionData.skills && connectionData.skills.length > 0) {
      const skillsText = connectionData.skills.join(', ');
      textsToEmbed.push({ text: skillsText, type: 'skills' });
    }

    // Experience embedding
    if (connectionData.experience) {
      const experienceText = `${connectionData.experience.title || ''} ${connectionData.experience.company || ''} ${connectionData.experience.duration || ''}`.trim();
      if (experienceText) {
        textsToEmbed.push({ text: experienceText, type: 'experience' });
      }
    }

    // Company embedding
    if (connectionData.company) {
      const companyText = `${connectionData.company.name || ''} ${connectionData.company.industry || ''} ${connectionData.company.size || ''}`.trim();
      if (companyText) {
        textsToEmbed.push({ text: companyText, type: 'company' });
      }
    }

    // Location embedding
    if (connectionData.location) {
      const locationText = `${connectionData.location.city || ''} ${connectionData.location.country || ''} ${connectionData.location.region || ''}`.trim();
      if (locationText) {
        textsToEmbed.push({ text: locationText, type: 'location' });
      }
    }

    // Network embedding
    if (connectionData.network) {
      const networkText = `${connectionData.network.mutualConnections || ''} ${connectionData.network.alumni || ''} ${connectionData.network.referrals || ''}`.trim();
      if (networkText) {
        textsToEmbed.push({ text: networkText, type: 'network' });
      }
    }

    // Goal embedding
    if (connectionData.goal) {
      const goalText = `${connectionData.goal.interests || ''} ${connectionData.goal.aspirations || ''} ${connectionData.goal.careerObjectives || ''}`.trim();
      if (goalText) {
        textsToEmbed.push({ text: goalText, type: 'goal' });
      }
    }

    // Education embedding
    if (connectionData.education) {
      const educationText = `${connectionData.education.degree || ''} ${connectionData.education.institution || ''} ${connectionData.education.field || ''}`.trim();
      if (educationText) {
        textsToEmbed.push({ text: educationText, type: 'education' });
      }
    }

    // Use batch embedding if we have multiple texts
    if (textsToEmbed.length > 1) {
      try {
                         const { embeddings: batchEmbeddings } = await embedMany({
          model: azure.textEmbeddingModel('text-embedding-3-large'),
          values: textsToEmbed.map(item => item.text),
          maxParallelCalls: 3, // Optimize performance
        });

        // Map the batch results back to their types
        textsToEmbed.forEach((item, index) => {
          embeddings[item.type] = batchEmbeddings[index];
        });
      } catch (error) {
        console.error('Batch embedding failed, falling back to individual:', error);
        // Fallback to individual embeddings
        for (const item of textsToEmbed) {
          embeddings[item.type] = await generateEmbedding(item.text);
        }
      }
    } else if (textsToEmbed.length === 1) {
      // Single embedding
      embeddings[textsToEmbed[0].type] = await generateEmbedding(textsToEmbed[0].text);
    }

    return NextResponse.json({ 
      success: true, 
      embeddings,
      connectionId: connectionData.id || 'new-connection',
      userId,
      method: 'ai-sdk-embeddings'
    });

  } catch (error) {
    console.error('Embedding generation failed:', error);
    return NextResponse.json({ 
      error: 'Embedding generation failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

async function generateEmbedding(text: string): Promise<number[]> {
  try {
             // Use AI SDK's embed function with Azure OpenAI
    const { embedding } = await embed({
      model: azure.textEmbeddingModel('text-embedding-3-large'),
      value: text,
      maxRetries: 2, // Add retry logic
    });
    
    return embedding;
  } catch (error) {
    console.error('AI SDK embedding failed:', error);
    // Fallback to our hash-based method
    return generateFallbackEmbedding(text);
  }
}

function generateFallbackEmbedding(text: string): number[] {
  // Improved fallback embedding based on text characteristics
  // text-embedding-3-large uses 3072 dimensions
  const embedding = new Array(3072).fill(0);
  const words = text.toLowerCase().split(/\s+/);
  
  // Create a more sophisticated hash-based embedding
  words.forEach((word, wordIndex) => {
    // Distribute the word's influence across multiple dimensions
    for (let i = 0; i < Math.min(word.length, 10); i++) {
      const char = word.charCodeAt(i);
      const position = (wordIndex * 10 + i) % 3072;
      
      // Create a more varied embedding pattern
      let hash = 0;
      for (let j = 0; j < word.length; j++) {
        hash = ((hash << 5) - hash + word.charCodeAt(j)) & 0xffffffff;
      }
      
      // Use both character position and word hash for variety
      const value = ((hash + char * (i + 1)) % 200 - 100) / 100;
      embedding[position] = value;
    }
  });
  
  // Add some semantic patterns based on text length and content
  const textLength = text.length;
  const hasNumbers = /\d/.test(text);
  const hasSpecialChars = /[^a-zA-Z0-9\s]/.test(text);
  
  // Use these characteristics to influence specific dimensions
  for (let i = 0; i < 100; i++) { // Increased for larger embedding
    const pos = (textLength * i) % 3072;
    let value = 0;
    
    if (hasNumbers) value += 0.1;
    if (hasSpecialChars) value += 0.1;
    value += (textLength % 100) / 100;
    
    embedding[pos] = Math.max(-1, Math.min(1, value));
  }
  
  return embedding;
} 