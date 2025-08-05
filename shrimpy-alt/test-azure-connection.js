import { createAzure } from '@ai-sdk/azure';
import { streamText } from 'ai';

// Load environment variables
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function testAzureConnection() {
  console.log('🔍 Testing Azure OpenAI Connection...\n');
  
  // Check environment variables
  console.log('Environment Variables:');
  console.log('AZURE_OPENAI_API_KEY exists:', !!process.env.AZURE_OPENAI_API_KEY);
  console.log('AZURE_RESOURCE_NAME:', process.env.AZURE_RESOURCE_NAME);
  console.log('AZURE_OPENAI_DEPLOYMENT_NAME:', process.env.AZURE_OPENAI_DEPLOYMENT_NAME);
  console.log('');
  
  if (!process.env.AZURE_OPENAI_API_KEY || !process.env.AZURE_RESOURCE_NAME) {
    console.log('❌ Missing required environment variables');
    return;
  }
  
  try {
    console.log('🔍 Creating Azure client...');
    const azure = createAzure({
      resourceName: process.env.AZURE_RESOURCE_NAME,
      apiKey: process.env.AZURE_OPENAI_API_KEY,
    });
    
    console.log('🔍 Azure client created successfully');
    
    console.log('🔍 Testing simple text generation...');
    const result = await streamText({
      model: azure(process.env.AZURE_OPENAI_DEPLOYMENT_NAME),
      messages: [{ role: 'user', content: 'Say "Hello World" in one word.' }],
      temperature: 0.1,
    });
    
    console.log('🔍 Azure OpenAI response received');
    const responseText = await result.text;
    console.log('✅ Azure OpenAI working! Response:', responseText);
    
  } catch (error) {
    console.error('❌ Azure OpenAI Error:', error.message);
    console.error('Error details:', error);
  }
}

testAzureConnection().catch(console.error); 