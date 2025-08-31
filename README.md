# Calendar Assistant

A modern, intelligent calendar companion built with React, TypeScript, and Material-UI. This application provides AI-powered calendar management, email drafting, and productivity insights.

## 🚀 Features

### Core Functionality
- **Google Calendar Integration**: Fetch and display upcoming events
- **AI-Powered Assistant**: Chat with Gemini (primary) or Ollama (fallback) for calendar management
- **Email Draft Creation**: Generate professional email drafts and templates
- **Meeting Scheduling**: Intelligent meeting time suggestions and scheduling
- **Productivity Analytics**: Comprehensive insights into your calendar patterns
- **ICS Export**: Download calendar events as ICS files

### Smart Suggestions
- Context-aware recommendations based on your calendar
- Meeting time optimization
- Email template suggestions
- Productivity improvement tips

### Modern UI/UX
- **Material-UI Design**: Polished, responsive interface
- **Component Architecture**: Modular, reusable components
- **TypeScript**: Full type safety and better development experience
- **Real-time Updates**: Live calendar synchronization

## 🏗️ Architecture

### Modular Design
The application is built with a clean, modular architecture:

```
src/
├── components/          # React UI components
│   ├── AuthButton.tsx   # Google authentication
│   ├── CalendarList.tsx # Event display
│   ├── Chat.tsx         # AI conversation interface
│   ├── SuggestionPicker.tsx # Smart suggestions
│   └── AnalyticsPanel.tsx   # Productivity insights
├── modules/             # Business logic modules
│   ├── calendar.ts      # Calendar event management
│   ├── scheduler.ts     # Meeting scheduling logic
│   ├── email.ts         # Email templates and Gmail integration
│   ├── calendarLinks.ts # Google Calendar URL generation
│   ├── ics.ts          # ICS file generation
│   ├── llmClient.ts    # AI client (Gemini + Ollama)
│   └── tools.ts        # Function calling and tool dispatch
├── types/              # TypeScript type definitions
│   └── index.ts        # Core type interfaces
└── App.tsx             # Main application component
```

### Key Modules

#### Calendar Module (`calendar.ts`)
- Event fetching and normalization
- Date range filtering
- Statistical analysis
- Event categorization

#### Scheduler Module (`scheduler.ts`)
- Free slot detection
- Meeting time optimization
- Availability checking
- Schedule analysis

#### Email Module (`email.ts`)
- Professional email templates
- Gmail compose URL generation
- Mailto link creation
- Bulk email support

#### LLM Client (`llmClient.ts`)
- Gemini primary with Ollama fallback
- Unified chat interface
- Context-aware responses
- Function calling support

#### Tools Module (`tools.ts`)
- Tool definitions and registration
- Function call dispatching
- Parameter validation
- Result handling

## 🛠️ Setup

### Prerequisites
- Node.js 16+ and npm
- Google Cloud Project with APIs enabled
- Ollama (optional, for local LLM fallback)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd calendar-assistant
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Configuration**
   Create a `.env` file in the root directory:
   ```env
   REACT_APP_GOOGLE_CLIENT_ID=your_google_client_id
   REACT_APP_GOOGLE_API_KEY=your_google_api_key
   REACT_APP_GCP_API_KEY=your_gcp_gemini_api_key
   ```

4. **Google Cloud Setup**
   - Enable Google Calendar API
   - Enable Gmail API
   - Enable Google Identity Services
   - Create OAuth 2.0 credentials
   - Create API keys

5. **Ollama Setup (Optional)**
   ```bash
   # Install Ollama
   curl -fsSL https://ollama.ai/install.sh | sh
   
   # Pull the model
   ollama pull llama3.1:8b
   ```

6. **Start the application**
   ```bash
   npm start
   ```

## 🔧 Configuration

### Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `REACT_APP_GOOGLE_CLIENT_ID` | Google OAuth Client ID | Yes |
| `REACT_APP_GOOGLE_API_KEY` | Google API Key | Yes |
| `REACT_APP_GCP_API_KEY` | GCP Gemini API Key | Yes |

### LLM Configuration

The application supports multiple LLM providers:

- **Primary**: Google Gemini (via GCP)
- **Fallback**: Ollama (local)

Configure in `src/modules/llmClient.ts`:
```typescript
const llmClient = new LLMClient({
  gcpApiKey: process.env.REACT_APP_GCP_API_KEY,
  ollamaUrl: 'http://localhost:11434',
  ollamaModel: 'llama3.1:8b',
});
```

## 🎯 Usage

### Authentication
1. Click "Sign in with Google"
2. Grant calendar and Gmail permissions
3. Access your calendar data

### Chat Interface
- Ask questions about your schedule
- Request meeting time suggestions
- Create email drafts
- Get productivity insights

### Smart Suggestions
- Click on contextual suggestions
- Get personalized recommendations
- Quick actions for common tasks

### Calendar Management
- View upcoming events
- Export events as ICS files
- Open events in Google Calendar
- Analyze productivity patterns

## 🔌 API Integration

### Google APIs
- **Calendar API**: Event fetching and management
- **Gmail API**: Email draft creation
- **Identity Services**: OAuth authentication

### AI Services
- **Google Gemini**: Primary AI assistant
- **Ollama**: Local LLM fallback

## 🧪 Development

### TypeScript
The entire codebase is written in TypeScript for:
- Type safety
- Better IDE support
- Reduced runtime errors
- Improved maintainability

### Component Structure
Each component follows React best practices:
- Functional components with hooks
- TypeScript interfaces
- Material-UI styling
- Responsive design

### Module Architecture
Business logic is separated into modules:
- Single responsibility principle
- Dependency injection
- Testable code
- Reusable services

## 🚀 Deployment

### Build for Production
```bash
npm run build
```

### Environment Setup
Ensure all environment variables are configured in your deployment platform.

### Static Hosting
The build output can be deployed to:
- Vercel
- Netlify
- AWS S3
- Google Cloud Storage

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 🆘 Support

For issues and questions:
1. Check the documentation
2. Review existing issues
3. Create a new issue with details

---

**Built with ❤️ using React, TypeScript, and Material-UI**
