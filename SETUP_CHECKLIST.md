# 🚀 Quick Setup Checklist

## ✅ Pre-Setup (5 minutes)
- [ ] **Node.js 18+** installed and verified
- [ ] **Git** installed and configured
- [ ] **Modern browser** ready (Chrome/Firefox/Safari/Edge)
- [ ] **Google account** with calendar access

## 🔑 Google Cloud Setup (15 minutes)
- [ ] **Create project** at [console.cloud.google.com](https://console.cloud.google.com/)
- [ ] **Enable APIs**: Calendar, Gmail, Identity Services
- [ ] **Create OAuth 2.0 Client ID** with redirect URI `http://localhost:3000`
- [ ] **Create API Key** for Google services
- [ ] **Copy credentials** to clipboard

## 🦙 Ollama Setup (10 minutes)
- [ ] **Install Ollama**: `curl -fsSL https://ollama.ai/install.sh | sh`
- [ ] **Start service**: `ollama serve`
- [ ] **Pull model**: `ollama pull llama3.1:8b`
- [ ] **Verify running**: `curl http://localhost:11434/api/tags`

## 📁 Code Setup (5 minutes)
- [ ] **Clone repo**: `git clone https://github.com/LucaiB/tenex_takehome.git`
- [ ] **Navigate**: `cd tenex_takehome`
- [ ] **Install deps**: `npm install`

## ⚙️ Environment Setup (2 minutes)
- [ ] **Create `.env` file** in root directory
- [ ] **Add credentials**:
  ```env
  REACT_APP_GOOGLE_CLIENT_ID=your_client_id_here
  REACT_APP_GOOGLE_API_KEY=your_api_key_here
  ```

## 🚀 Launch (1 minute)
- [ ] **Start app**: `npm start`
- [ ] **Open browser**: Navigate to `http://localhost:3000`
- [ ] **Sign in** with Google account
- [ ] **Grant permissions** for calendar and Gmail

## 🧪 Test Features
- [ ] **Calendar events** load and display
- [ ] **Chat interface** responds to queries
- [ ] **Date parsing** works: "next Wednesday at 11 AM"
- [ ] **Email templates** generate properly
- [ ] **Error handling** shows helpful messages

## 🔍 Troubleshooting Quick Fixes
- **Ollama not responding**: Restart with `ollama serve`
- **OAuth errors**: Check redirect URI includes `http://localhost:3000`
- **Build errors**: Delete `node_modules/` and run `npm install`
- **Permission denied**: Sign out/in and check Google account settings

## 📚 What to Explore
- **Smart date parsing** in natural language
- **Function calling** architecture in `src/modules/tools.ts`
- **Error handling** patterns throughout the codebase
- **TypeScript** usage and type safety
- **Modular architecture** and separation of concerns
---
