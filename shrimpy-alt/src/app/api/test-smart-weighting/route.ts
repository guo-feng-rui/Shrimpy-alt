import { NextRequest, NextResponse } from 'next/server';
import { SmartWeighting } from '../../../lib/smart-weighting';

export async function POST(req: NextRequest) {
  try {
    const { query, goal } = await req.json();
    
    if (!query) {
      return NextResponse.json({ error: 'Query is required' }, { status: 400 });
    }

    // Test the smart weighting system
    const weights = await SmartWeighting.calculateSmartWeights(query, goal);
    const analysis = await SmartWeighting.analyzeSemanticIntent(query);
    
    // Also test pattern recognition and contextual analysis
    const patterns = SmartWeighting.detectPatterns(query);
    const context = SmartWeighting.analyzeContext(query);

    return NextResponse.json({
      success: true,
      query,
      weights,
      analysis,
      patterns,
      context,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Smart weighting test error:', error);
    return NextResponse.json({
      error: 'Test failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function GET() {
  // Return system information
  return NextResponse.json({
    system: 'Smart Weighting System',
    version: '1.0.0',
    features: [
      'AI-Powered Semantic Analysis',
      'Pattern Recognition',
      'Contextual Analysis',
      'Goal-Aware Weighting',
      'Fallback Systems'
    ],
    testQueries: [
      "Find senior Python developers in San Francisco",
      "I need someone who can help me scale my business",
      "Looking for a mentor who understands the startup world",
      "Want to connect with people who are passionate about AI",
      "Need someone with experience in the field",
      "Anyone working on interesting projects?",
      "Specifically looking for a senior React developer with 5+ years experience",
      "Maybe someone who kind of knows about machine learning?",
      "I'm desperate to find someone who can help me with this urgent project"
    ]
  });
} 