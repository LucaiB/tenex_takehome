# Calendar Assistant Setup Guide

## Quick Setup

To get the Calendar Assistant working, you need to configure API keys for the AI services.

### 1. Create Environment File

Copy the example environment file:
```bash
cp env.example .env
```

### 2. Configure API Keys

Edit the `.env` file and add your API keys:

```env
# Google OAuth and Calendar API
REACT_APP_GOOGLE_CLIENT_ID=your_google_oauth_client_id_here
REACT_APP_GOOGLE_API_KEY=your_google_api_key_here

# Google Cloud Platform Generative AI (Primary LLM)
REACT_APP_GCP_API_KEY=your_gcp_generative_ai_api_key_here
```

### 3. Get Your API Keys

#### Google Cloud Platform (GCP) API Key (Required for AI)
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable the "Generative AI API"
4. Go to "APIs & Services" > "Credentials"
5. Create an API key
6. Copy the key to `REACT_APP_GCP_API_KEY`

#### Google OAuth (Optional - for Calendar Access)
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Enable "Google Calendar API"
3. Go to "APIs & Services" > "Credentials"
4. Create OAuth 2.0 Client ID
5. Add authorized origins: `http://localhost:3000`
6. Copy Client ID to `REACT_APP_GOOGLE_CLIENT_ID`

### 4. Restart the Application

After adding your API keys, restart the development server:
```bash
npm start
```

### 5. Test the Setup

Try asking the AI assistant a simple question like "Hello" or "What can you do?"

## Troubleshooting

### "I'm having trouble connecting to my AI services"
- Check that `REACT_APP_GCP_API_KEY` is set correctly
- Verify the API key has access to Generative AI API
- Check the browser console for detailed error messages

### "I'm not able to process requests right now"
- Make sure you have at least one LLM service configured
- Check that your API keys are valid and have proper permissions

### Calendar Features Not Working
- Ensure Google OAuth is properly configured
- Check that Calendar API is enabled in your Google Cloud project

## Alternative: Local Ollama Setup

If you prefer to run AI locally instead of using GCP:

1. Install [Ollama](https://ollama.ai/)
2. Run: `ollama run llama3.1:8b`
3. The app will automatically fall back to Ollama if GCP is not available

## Support

If you're still having issues:
1. Check the browser console for error messages
2. Verify all API keys are correctly set
3. Ensure the required APIs are enabled in Google Cloud Console
