# Azure OpenAI Setup Guide

The application has been configured to use Azure OpenAI instead of OpenAI directly. Follow these steps to complete the setup:

## 1. Update Environment Variables

Edit the `.env.local` file with your Azure OpenAI configuration:

```env
# Azure OpenAI Configuration
AZURE_OPENAI_API_KEY=your_azure_openai_api_key_here
AZURE_OPENAI_ENDPOINT=https://your-resource-name.openai.azure.com
AZURE_OPENAI_API_VERSION=2024-02-15-preview
AZURE_OPENAI_DEPLOYMENT_NAME=your_deployment_name
```

## 2. Required Values

You'll need to get these values from your Azure portal:

- **API Key**: From your Azure OpenAI resource → Keys and Endpoint
- **Endpoint**: Your Azure OpenAI resource URL (e.g., `https://myresource.openai.azure.com`)
- **Deployment Name**: The name you gave to your GPT-4 model deployment
- **API Version**: Use `2024-02-15-preview` (or latest stable version)

## 3. Test the Setup

1. ✅ Environment variables are configured with your Azure OpenAI values
2. ✅ Server is running on http://localhost:3011
3. 🔧 **Current Issue**: Messages aren't displaying after sending
4. **Status**: Input works, API calls work, but message display needs fixing

## 4. Troubleshooting

If you encounter issues:

- Verify your deployment name matches exactly (case-sensitive)
- Ensure your Azure OpenAI resource has the correct API permissions
- Check that your deployment is using a compatible model (GPT-4, GPT-3.5-turbo, etc.)
- Confirm the API version is supported by your Azure OpenAI resource

## 5. Implementation Details

The application now uses:
- `@ai-sdk/azure` package for Azure OpenAI integration
- Custom Azure provider configuration in `/api/chat/route.ts`
- Environment-based configuration for flexibility

The chat interface will now stream responses from your Azure OpenAI deployment!