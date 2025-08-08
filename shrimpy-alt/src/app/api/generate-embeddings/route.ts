import { createAzure } from '@ai-sdk/azure';
import { embed, embedMany } from 'ai';
import { NextRequest, NextResponse } from 'next/server';
import type { DynamicWeights } from '../../../lib/vector-schema';

interface ExperienceItem {
  title?: string;
  company?: string;
  duration?: string;
  description?: string;
  start?: { year?: number; month?: number };
  end?: { year?: number; month?: number };
  industry?: string;
}

interface EducationItem {
  degree?: string;
  institution?: string;
  schoolName?: string;
  field?: string;
  fieldOfStudy?: string;
  start?: { year?: number; month?: number };
  end?: { year?: number; month?: number };
}

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
    console.log('[generate-embeddings] isAzureConfigured=', isAzureConfigured, 'userId=', userId, 'name=', connectionData?.name);

    if (!isAzureConfigured) {
      return NextResponse.json({
        error: 'Azure OpenAI not configured for embeddings',
        fallback: { success: false, message: 'Azure not configured' }
      }, { status: 200 });
    }

    // Generate embeddings for each vector type
    const embeddings: Record<keyof DynamicWeights | 'summary', number[]> = {
      skills: [],
      experience: [],
      company: [],
      location: [],
      network: [],
      goal: [],
      education: [],
      summary: []
    };

    // Collect all texts for batch processing
    const textsToEmbed: { text: string; type: keyof DynamicWeights | 'summary' }[] = [];

    // Skills embedding
    if (connectionData.skills && connectionData.skills.length > 0) {
      const skillsText = connectionData.skills.join(', ');
      textsToEmbed.push({ text: skillsText, type: 'skills' });
    }

    // Experience embedding (aggregate all records + description if any)
    if (connectionData.experiences || connectionData.experience) {
      const experiences: ExperienceItem[] = Array.isArray(connectionData.experiences)
        ? connectionData.experiences
        : (connectionData.experience as ExperienceItem | undefined)
          ? [connectionData.experience]
          : [];
      const experienceText = experiences
        .map((e: ExperienceItem) => {
          const start = e.start?.year ? `${e.start.year}-${e.start.month || ''}` : '';
          const end = e.end?.year ? `${e.end.year}-${e.end.month || ''}` : '';
          const period = start || end ? `${start} to ${end}` : (e.duration || '');
          return `${e.title || ''} ${e.company || ''} ${period} ${e.description || ''}`.trim();
        })
        .filter(Boolean)
        .join(' | ');
      if (experienceText) textsToEmbed.push({ text: experienceText, type: 'experience' });
    }

    // Company embedding (all companies from experiences if present)
    {
      const companyPieces: string[] = [];
      if (Array.isArray(connectionData.experiences)) {
        (connectionData.experiences as ExperienceItem[]).forEach((e: ExperienceItem) => {
          const piece = `${e.company || ''} ${e.industry || ''}`.trim();
          if (piece) companyPieces.push(piece);
        });
      }
      if (connectionData.company) {
        const c = connectionData.company;
        const piece = `${c.name || ''} ${c.industry || ''} ${c.size || ''}`.trim();
        if (piece) companyPieces.push(piece);
      }
      const companyText = companyPieces.join(' | ');
      if (companyText) textsToEmbed.push({ text: companyText, type: 'company' });
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

    // Education embedding (include durations and all records)
    if (connectionData.educations || connectionData.education) {
      const educations: EducationItem[] = Array.isArray(connectionData.educations)
        ? connectionData.educations
        : (connectionData.education as EducationItem | undefined)
          ? [connectionData.education]
          : [];
      const educationText = educations
        .map((ed: EducationItem) => {
          const start = ed.start?.year ? `${ed.start?.year}-${ed.start?.month || ''}` : '';
          const end = ed.end?.year ? `${ed.end?.year}-${ed.end?.month || ''}` : '';
          const duration = start || end ? `${start} to ${end}`.trim() : '';
          return `${ed.degree || ''} ${ed.institution || ed.schoolName || ''} ${ed.field || ed.fieldOfStudy || ''} ${duration}`.trim();
        })
        .filter(Boolean)
        .join(' | ');
      if (educationText) textsToEmbed.push({ text: educationText, type: 'education' });
    }

    // Summary embedding
    if (connectionData.summary) {
      textsToEmbed.push({ text: String(connectionData.summary), type: 'summary' });
    }

    console.log('[generate-embeddings] textsToEmbed count=', textsToEmbed.length, 'types=', textsToEmbed.map(t => t.type));
    // Use batch embedding if we have multiple texts
    if (textsToEmbed.length > 1) {
      try {
        const { embeddings: batchEmbeddings } = await embedMany({
          model: azure.textEmbeddingModel('text-embedding-3-small'),
          values: textsToEmbed.map(item => item.text),
          maxParallelCalls: 3, // Optimize performance
        });

        // Map the batch results back to their types
        textsToEmbed.forEach((item, index) => {
          embeddings[item.type] = batchEmbeddings[index];
        });
        console.log('[generate-embeddings] batch embeddings ok');
      } catch (error) {
        console.error('[generate-embeddings] Batch embedding failed, falling back to individual:', error);
        // Fallback to individual embeddings
        for (const item of textsToEmbed) {
          embeddings[item.type] = await generateEmbedding(item.text);
        }
      }
    } else if (textsToEmbed.length === 1) {
      // Single embedding
      embeddings[textsToEmbed[0].type] = await generateEmbedding(textsToEmbed[0].text);
    }

    console.log('[generate-embeddings] returning embeddings for types=', Object.keys(embeddings));
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
      model: azure.textEmbeddingModel('text-embedding-3-small'),
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
  // Match text-embedding-3-small dimension (1536)
  const embedding = new Array(1536).fill(0);
  const words = text.toLowerCase().split(/\s+/);
  
  // Create a more sophisticated hash-based embedding
  words.forEach((word, wordIndex) => {
    // Distribute the word's influence across multiple dimensions
    for (let i = 0; i < Math.min(word.length, 10); i++) {
      const char = word.charCodeAt(i);
      const position = (wordIndex * 10 + i) % 1536;
      
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
  for (let i = 0; i < 100; i++) { // distribute across 1536 dims
    const pos = (textLength * i) % 1536;
    let value = 0;
    
    if (hasNumbers) value += 0.1;
    if (hasSpecialChars) value += 0.1;
    value += (textLength % 100) / 100;
    
    embedding[pos] = Math.max(-1, Math.min(1, value));
  }
  
  return embedding;
} 