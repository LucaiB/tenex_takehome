# 🗓️ Calendar Assistant - Take-Home Project

A modern, intelligent calendar companion built with React, TypeScript, and Material-UI. This application provides AI-powered calendar management, email drafting, and productivity insights using Google Calendar API and Ollama for local AI processing.

## 🎯 Project Overview

This is a **production-ready calendar assistant** that demonstrates:
- **Full-stack React/TypeScript development**
- **Google Calendar & Gmail API integration**
- **Local AI processing with Ollama**
- **Smart date parsing and natural language processing**
- **Professional email template generation**
- **Comprehensive error handling and debugging**

## 🚀 Key Features

### Core Functionality
- **Google Calendar Integration**: Fetch, display, and manage calendar events
- **AI-Powered Assistant**: Local LLM processing with Ollama for privacy
- **Smart Date Parsing**: Converts "next Wednesday at 11 AM" to actual dates
- **Email Draft Creation**: Generate professional email templates and follow-ups
- **Meeting Scheduling**: Intelligent time suggestions and calendar link generation
- **Productivity Analytics**: Comprehensive calendar pattern insights
- **ICS Export**: Download events as calendar files

### Technical Highlights
- **Ollama-Only Implementation**: No external AI API dependencies
- **Robust Error Handling**: Graceful fallbacks and user-friendly messages
- **TypeScript Throughout**: Full type safety and modern development practices
- **Modular Architecture**: Clean separation of concerns and testable code
- **Real-time Updates**: Live calendar synchronization and state management

## 🏗️ Architecture

```
src/
├── components/          # React UI components
│   ├── AuthButton.tsx   # Google OAuth authentication
│   ├── CalendarList.tsx # Event display and management
│   ├── Chat.tsx         # AI conversation interface
│   ├── CalendarView.tsx # Calendar visualization
│   ├── SuggestionPicker.tsx # Smart suggestions
│   └── AnalyticsPanel.tsx   # Productivity insights
├── modules/             # Business logic modules
│   ├── calendar.ts      # Calendar event management
│   ├── scheduler.ts     # Meeting scheduling logic
│   ├── email.ts         # Email templates and Gmail integration
│   ├── calendarLinks.ts # Google Calendar URL generation
│   ├── ics.ts          # ICS file generation
│   ├── llmClient.ts    # Ollama AI client
│   └── tools.ts        # Function calling and tool dispatch
├── types/              # TypeScript type definitions
├── hooks/              # Custom React hooks
└── utils/              # Utility functions
```

## 🛠️ Setup Guide

### Prerequisites
- **Node.js 18+** and npm
- **Google Cloud Project** with APIs enabled
- **Ollama** for local AI processing
- **Modern web browser** (Chrome, Firefox, Safari, Edge)

### Step 1: Clone and Install

```bash
# Clone the repository
git clone https://github.com/LucaiB/tenex_takehome.git
cd tenex_takehome

# Install dependencies
npm install
```

### Step 2: Google Cloud Setup

#### 2.1 Create Google Cloud Project
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click "Select a project" → "New Project"
3. Name it: `calendar-assistant-takehome`
4. Click "Create"

#### 2.2 Enable Required APIs
In your project, enable these APIs:
- **Google Calendar API**
- **Gmail API** 
- **Google Identity Services**

```bash
# Enable APIs via gcloud CLI (optional)
gcloud services enable calendar-json.googleapis.com
gcloud services enable gmail.googleapis.com
gcloud services enable identityservices.googleapis.com
```

#### 2.3 Create OAuth 2.0 Credentials
1. Go to "APIs & Services" → "Credentials"
2. Click "Create Credentials" → "OAuth 2.0 Client IDs"
3. Application type: **Web application**
4. Authorized redirect URIs:
   - `http://localhost:3000` (for development)
   - `http://localhost:3000/` (alternative)
5. Click "Create"
6. **Copy the Client ID** - you'll need this for `REACT_APP_GOOGLE_CLIENT_ID`

#### 2.4 Create API Key
1. Go to "APIs & Services" → "Credentials"
2. Click "Create Credentials" → "API Key"
3. **Copy the API Key** - you'll need this for `REACT_APP_GOOGLE_API_KEY`

### Step 3: Ollama Setup

#### 3.1 Install Ollama
```bash
# macOS/Linux
curl -fsSL https://ollama.ai/install.sh | sh

# Windows
# Download from https://ollama.ai/download
```

#### 3.2 Start Ollama Service
```bash
# Start the Ollama service
ollama serve

# In a new terminal, pull the model
ollama pull llama3.1:8b
```

#### 3.3 Verify Ollama is Running
```bash
# Test if Ollama is responding
curl http://localhost:11434/api/tags
```

**Expected Response:**
```json
{
  "models": [
    {
      "name": "llama3.1:8b",
      "modified_at": "2024-01-XX...",
      "size": 1234567890
    }
  ]
}
```

### Step 4: Environment Configuration

Create a `.env` file in the root directory:

```env
# Google OAuth (Required)
REACT_APP_GOOGLE_CLIENT_ID=your_oauth_client_id_here

# Google API (Required)
REACT_APP_GOOGLE_API_KEY=your_google_api_key_here

# Ollama Configuration (Optional - defaults shown)
REACT_APP_OLLAMA_URL=http://localhost:11434
REACT_APP_OLLAMA_MODEL=llama3.1:8b
```

**⚠️ Important:** Never commit your `.env` file to version control!

### Step 5: Start the Application

```bash
# Start the development server
npm start
```

The app will open at `http://localhost:3000`

## 🔧 Configuration Details

### Environment Variables

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `REACT_APP_GOOGLE_CLIENT_ID` | Google OAuth Client ID | ✅ Yes | - |
| `REACT_APP_GOOGLE_API_KEY` | Google API Key | ✅ Yes | - |
| `REACT_APP_OLLAMA_URL` | Ollama service URL | ❌ No | `http://localhost:11434` |
| `REACT_APP_OLLAMA_MODEL` | Ollama model name | ❌ No | `llama3.1:8b` |

### Ollama Configuration

The application is configured to use Ollama as the primary AI service:

```typescript
// src/modules/llmClient.ts
const llmClient = new LLMClient({
  ollamaUrl: 'http://localhost:11434',
  ollamaModel: 'llama3.1:8b',
});
```

## 🎯 Usage Examples

### 1. Calendar Management
```
User: "Show me my upcoming events"
Assistant: Fetches and displays your calendar events

User: "Make a calendar link for a 'Sprint Planning' meeting next Wednesday at 11 AM for 1 hour with Will and Matt"
Assistant: Generates Google Calendar link with correct date calculation
```

### 2. Email Drafting
```
User: "Send a follow-up email to Dan about the 'Weekly Sync' meeting"
Assistant: Creates professional follow-up email template

User: "Create an email template for meeting confirmations"
Assistant: Generates customizable email template
```

### 3. Smart Scheduling
```
User: "Suggest meeting times for a 1-hour meeting with Joe and Sally"
Assistant: Analyzes calendar and suggests optimal time slots

User: "Help me reduce my meetings"
Assistant: Provides productivity insights and optimization suggestions
```

### 4. Productivity Analysis
```
User: "How much of my time am I spending in meetings this week?"
Assistant: Generates comprehensive productivity report
```

## 🧪 Development

### Available Scripts
```bash
npm start          # Start development server
npm run build      # Build for production
npm run test       # Run tests (if configured)
npm run eject      # Eject from Create React App (not recommended)
```

### TypeScript Configuration
- **Strict mode enabled** for better type safety
- **Modern ES features** support
- **Path aliases** for clean imports
- **Full type coverage** across the codebase

### Code Quality
- **ESLint** configuration for code standards
- **Prettier** for consistent formatting
- **TypeScript strict mode** for type safety
- **Modular architecture** for maintainability

## 🚀 Deployment

### Build for Production
```bash
npm run build
```

The build output will be in the `build/` directory.

### Deployment Options
- **Vercel**: Drag and drop the `build/` folder
- **Netlify**: Connect your GitHub repo
- **AWS S3**: Upload `build/` contents
- **Google Cloud Storage**: Upload `build/` contents

### Environment Variables in Production
Ensure all required environment variables are set in your deployment platform:
- `REACT_APP_GOOGLE_CLIENT_ID`
- `REACT_APP_GOOGLE_API_KEY`

## 🔍 Troubleshooting

### Common Issues

#### 1. Ollama Connection Error
```
Error: Failed to connect to Ollama
```
**Solution:**
- Ensure Ollama is running: `ollama serve`
- Check if port 11434 is accessible: `curl http://localhost:11434/api/tags`
- Verify firewall settings

#### 2. Google OAuth Error
```
Error: Invalid client ID
```
**Solution:**
- Verify `REACT_APP_GOOGLE_CLIENT_ID` in `.env`
- Check OAuth redirect URIs include `http://localhost:3000`
- Ensure Google Calendar API is enabled

#### 3. Calendar Permission Error
```
Error: Calendar access denied
```
**Solution:**
- Sign out and sign back in
- Check Google account permissions
- Verify calendar sharing settings

#### 4. Build Errors
```
Error: Module not found
```
**Solution:**
- Delete `node_modules/` and `package-lock.json`
- Run `npm install` again
- Check Node.js version (requires 18+)

