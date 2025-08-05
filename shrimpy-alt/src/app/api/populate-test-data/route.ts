import { NextRequest, NextResponse } from 'next/server';
import { DataPopulation } from '../../../lib/data-population';
import { parseLinkedInCSV } from '../../../lib/csv-parser';
import { requireAuth } from '../../../lib/auth-middleware';
import { setupTestData } from '../../../lib/test-data-setup';

export async function POST(req: NextRequest) {
  try {
    // Authenticate the request
    const { userId: authUserId } = requireAuth(req);
    
    const { csvContent, userId, mode = 'csv' } = await req.json();

    // Use authenticated user ID if not provided in body
    const finalUserId = userId || authUserId;

    if (!finalUserId) {
      return NextResponse.json({ 
        error: 'User ID is required' 
      }, { status: 400 });
    }

    console.log('📊 Starting data population...');
    console.log('📊 User ID:', finalUserId);
    console.log('📊 Mode:', mode);

    if (mode === 'firestore') {
      // First, setup test data if profileCache is empty
      console.log('📊 Setting up test data...');
      await setupTestData(finalUserId);
      
      // Step 3: Generate embeddings from existing Firestore data (profileCache collection)
      const populationResult = await DataPopulation.generateEmbeddingsFromFirestore(finalUserId);
      
      console.log('📊 Firestore population completed:', populationResult);

      return NextResponse.json({
        success: true,
        message: `Successfully generated embeddings for ${populationResult.success} connections from profileCache`,
        populationResult,
        mode: 'firestore',
        timestamp: new Date().toISOString()
      });
    } else {
      // CSV upload flow
      if (!csvContent) {
        return NextResponse.json({ 
          error: 'CSV content is required for CSV mode' 
        }, { status: 400 });
      }

      console.log('📊 CSV content length:', csvContent.length);

      // Parse CSV content
      const parseResult = parseLinkedInCSV(csvContent);
      console.log('📊 Parsed connections:', parseResult.connections.length);

      if (parseResult.connections.length === 0) {
        return NextResponse.json({
          error: 'No valid connections found in CSV',
          parseResult
        }, { status: 400 });
      }

      // Populate Firestore with embeddings
      const populationResult = await DataPopulation.populateFirestoreWithEmbeddings(
        parseResult.connections,
        finalUserId
      );

      console.log('📊 CSV population completed:', populationResult);

      return NextResponse.json({
        success: true,
        message: `Successfully populated ${populationResult.success} connections`,
        populationResult,
        parseResult: {
          totalCount: parseResult.totalCount,
          validCount: parseResult.validCount,
          errorCount: parseResult.errors.length
        },
        mode: 'csv',
        timestamp: new Date().toISOString()
      });
    }

  } catch (error) {
    console.error('📊 Data population failed:', error);
    return NextResponse.json({ 
      error: 'Data population failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    // Authenticate the request
    const { userId: authUserId } = requireAuth(req);
    
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');

    // Use authenticated user ID if not provided in query params
    const finalUserId = userId || authUserId;

    if (!finalUserId) {
      return NextResponse.json({ 
        error: 'User ID is required' 
      }, { status: 400 });
    }

    // Generate sample CSV data for testing
    const sampleCSV = generateSampleCSV();
    
    return NextResponse.json({
      success: true,
      message: 'Sample CSV data generated',
      sampleCSV,
      instructions: [
        '1. Use this sample CSV to test data population',
        '2. POST to this endpoint with the CSV content and user ID',
        '3. The system will generate embeddings and store in Firestore',
        '4. Then you can test the search APIs'
      ],
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('📊 Sample data generation failed:', error);
    return NextResponse.json({ 
      error: 'Sample data generation failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

function generateSampleCSV(): string {
  return `First Name,Last Name,URL,Company,Position,Location,Industry
John,Doe,john-doe-123,Tech Corp,Senior React Developer,Taipei Taiwan,Technology
Jane,Smith,jane-smith-456,Startup Inc,Frontend Engineer,San Francisco CA,Technology
Mike,Johnson,mike-johnson-789,Big Corp,Backend Developer,New York NY,Finance
Sarah,Wilson,sarah-wilson-101,AI Startup,ML Engineer,Austin TX,Technology
David,Brown,david-brown-202,Consulting Co,DevOps Engineer,Seattle WA,Consulting
Lisa,Chen,lisa-chen-303,Tech Giant,Product Manager,Beijing China,Technology
Alex,Taylor,alex-taylor-404,Startup Hub,Full Stack Developer,London UK,Technology
Maria,Garcia,maria-garcia-505,Enterprise Inc,Software Architect,Boston MA,Technology
Tom,Lee,tom-lee-606,Innovation Lab,Data Scientist,Singapore,Technology
Emma,Davis,emma-davis-707,Scale Up,Engineering Manager,Berlin Germany,Technology`;
} 