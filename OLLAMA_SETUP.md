# Ollama Setup for Local LLM Fallback

This guide will help you set up Ollama to run a local LLM as a fallback option for your calendar assistant chatbot when Google's Generative AI is unavailable.

## Quick Setup

### 1. Install Ollama
```bash
# macOS
curl -fsSL https://ollama.ai/install.sh | sh

# Or download from: https://ollama.ai/download
```

### 2. Start Ollama
```bash
ollama serve
```

### 3. Download a Model
```bash
# Llama 3.1 (8B - good balance of speed/quality)
ollama pull llama3.1:8b

# Or try other models:
# ollama pull llama3.1:70b    # Higher quality, slower
# ollama pull mistral:7b       # Fast, good quality
# ollama pull codellama:7b     # Good for code-related questions
```

### 4. Test the Model
```bash
ollama run llama3.1:8b "Hello, how are you?"
```

## Integration with Calendar Assistant

The app is now configured to:
- ✅ Use specific commands for calendar/email functions
- ✅ Use Google Gemini AI as primary LLM for general questions
- ✅ Fall back to local LLM when GCP is unavailable
- ✅ Show loading state while LLM is thinking
- ✅ Provide context about your calendar to the LLM

## How It Works

1. **Specific Commands**: Calendar queries, email creation, etc. use built-in logic
2. **General Questions**: Primary AI responses come from Google Gemini via GCP
3. **Fallback**: If GCP fails, automatically switches to your local LLM
4. **Context**: Both LLMs get info about your upcoming events
5. **Local Processing**: Fallback responses happen on your machine

## Benefits

- 🔒 **Privacy**: Fallback responses stay on your machine
- 🚀 **Speed**: Local processing when GCP is unavailable
- 💰 **Cost**: Free fallback option
- 🎯 **Customizable**: You control the local model and prompts
- 🛡️ **Reliability**: Always have AI assistance available

## Troubleshooting

### Port 11434 Already in Use
```bash
# Check what's using the port
lsof -i :11434

# Kill the process
kill -9 <PID>
```

### Model Not Found
```bash
# List available models
ollama list

# Pull the model again
ollama pull llama3.1:8b
```

### Slow Responses
- Try a smaller model: `ollama pull llama3.1:3b`
- Ensure Ollama has enough RAM allocated
- Close other resource-intensive applications

## Advanced Configuration

### Custom Models
```bash
# Create a custom model with specific instructions
ollama create calendar-assistant -f Modelfile
```

### Modelfile Example
```
FROM llama3.1:8b

SYSTEM You are a helpful calendar assistant. You help users manage their schedule, create emails, and provide productivity advice. Be concise and practical.
```

## Next Steps

1. **Install Ollama** following the steps above
2. **Start the service** with `ollama serve`
3. **Download a model** like `llama3.1:8b`
4. **Test your calendar assistant** with general questions!

Your calendar assistant will now have AI-powered responses for any question that isn't covered by the specific commands! 🎉
