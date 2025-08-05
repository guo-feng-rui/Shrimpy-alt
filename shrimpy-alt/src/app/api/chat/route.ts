import { createAzure } from '@ai-sdk/azure';
import { streamText, UIMessage, convertToModelMessages } from 'ai';

const azure = createAzure({
  resourceName: process.env.AZURE_RESOURCE_NAME || 'shrimpy-dev-tmp-resource',
  apiKey: process.env.AZURE_OPENAI_API_KEY,
  apiVersion: '2024-04-01-preview',
});

export async function POST(req: Request) {
  try {
    console.log('Chat API: Starting request processing');
    const { messages }: { messages: UIMessage[] } = await req.json();
    console.log('Chat API: Messages received:', messages?.length || 0);

    // Check if Azure OpenAI is configured
    const isAzureConfigured = process.env.AZURE_OPENAI_API_KEY && 
                             process.env.AZURE_RESOURCE_NAME && 
                             process.env.AZURE_OPENAI_DEPLOYMENT_NAME;

    if (!isAzureConfigured) {
      console.log('Chat API: Azure OpenAI not configured, returning fallback response');
      
      // Return a streaming response that mimics the AI SDK format
      const fallbackResponse = `I'm here to help you with Weak-Tie Activator! 

To get started:
1. Upload your LinkedIn connections CSV file
2. I'll help you enrich the profiles with detailed data
3. Describe your networking goals and I'll provide personalized recommendations

Note: Azure OpenAI is not configured yet. Please set up your environment variables to enable full AI chat functionality.

For now, I can help you with basic guidance on using the platform.`;

      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        start(controller) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'text-delta', textDelta: fallbackResponse })}\n\n`));
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'finish' })}\n\n`));
          controller.close();
        }
      });

      return new Response(stream, {
        headers: {
          'Content-Type': 'text/plain; charset=utf-8',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        }
      });
    }

    console.log('Chat API: Azure config check:', {
      hasApiKey: !!process.env.AZURE_OPENAI_API_KEY,
      hasResourceName: !!process.env.AZURE_RESOURCE_NAME,
      hasDeployment: !!process.env.AZURE_OPENAI_DEPLOYMENT_NAME,
      apiVersion: 'preview'
    });

    // Azure is configured, use it
    console.log('Chat API: Azure OpenAI configured, using Azure API');
    
         try {
       const result = await streamText({
         model: azure(process.env.AZURE_OPENAI_DEPLOYMENT_NAME || 'gpt-4o'),
         system: `You are the AI assistant for Weak-Tie Activator, a platform that helps users analyze and activate their LinkedIn professional networks. Your role is to:

1. Help users understand how to upload and process their LinkedIn connections data
2. Guide them through profile enrichment features 
3. Assist with defining networking goals and missions
4. Provide personalized recommendations for reaching out to connections
5. Explain how to leverage weak ties for career opportunities

Be conversational, helpful, and focused on professional networking strategy. Keep responses concise but actionable.`,
         messages: convertToModelMessages(messages),
       });

       console.log('Chat API: StreamText completed successfully');
       
       // Return the response with proper streaming format for useChat
       return result.toUIMessageStreamResponse();
    } catch (azureError: unknown) {
      console.error('Chat API: Azure OpenAI error:', azureError);
      
      // Check if it's a deployment not found error
      const errorMessage = azureError instanceof Error ? azureError.message : String(azureError);
      if (errorMessage.includes('DeploymentNotFound') || errorMessage.includes('does not exist')) {
        console.log('Chat API: Deployment not found, returning fallback response');
        
        const fallbackResponse = `I'm here to help you with Weak-Tie Activator! 

To get started:
1. Upload your LinkedIn connections CSV file
2. I'll help you enrich the profiles with detailed data
3. Describe your networking goals and I'll provide personalized recommendations

Note: The Azure OpenAI deployment "${process.env.AZURE_OPENAI_DEPLOYMENT_NAME}" was not found. Please check your deployment name in the Azure portal and update your environment variables.

For now, I can help you with basic guidance on using the platform.`;

        const encoder = new TextEncoder();
        const stream = new ReadableStream({
          start(controller) {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'text-delta', textDelta: fallbackResponse })}\n\n`));
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'finish' })}\n\n`));
            controller.close();
          }
        });

        return new Response(stream, {
          headers: {
            'Content-Type': 'text/plain; charset=utf-8',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
          }
        });
      }
      
      // Re-throw other Azure errors
      throw azureError;
    }
  } catch (error) {
    console.error('Chat API: Error occurred:', error);
    return new Response(JSON.stringify({ 
      error: 'Failed to process chat request', 
      details: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

export async function OPTIONS(req: Request) {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    }
  });
}
