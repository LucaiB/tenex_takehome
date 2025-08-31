import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Container,
  Box,
  Typography,
  AppBar,
  Toolbar,
  CssBaseline,
  ThemeProvider,
  createTheme,
  Alert,
  CircularProgress,
  Button,
  TextField,
  Paper,
  InputAdornment,
  IconButton,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
} from '@mui/material';
import { 
  CalendarToday as CalendarIcon,
  ViewList as ViewListIcon,
  ViewModule as ViewModuleIcon,
  Search as SearchIcon,
  Send as SendIcon,
  SmartToy as BotIcon,
  KeyboardArrowDown as KeyboardArrowDownIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';

// Components
import AuthButton from './components/AuthButton';
import CalendarList from './components/CalendarList';
import CalendarView from './components/CalendarView';
import Chat from './components/Chat';
import SuggestionPicker from './components/SuggestionPicker';
import AnalyticsPanel from './components/AnalyticsPanel';
import EnergyBallIcon from './components/EnergyBallIcon';

// Modules
import { CalendarService, normalizeEvents } from './modules/calendar';
import { EmailService } from './modules/email';
import { SchedulerService } from './modules/scheduler';
import { CalendarLinkBuilder } from './modules/calendarLinks';
import { ICSGenerator } from './modules/ics';
import { LLMClient } from './modules/llmClient';
import { ToolDispatcher } from './modules/tools';

// Types
import {
  AuthState,
  CalendarState,
  ChatMessage,
  NormalizedEvent,
  Suggestion,
  FunctionCall,
} from './types';

// Environment variables
const CLIENT_ID = process.env.REACT_APP_GOOGLE_CLIENT_ID || '';
const GCP_API_KEY = process.env.REACT_APP_GCP_API_KEY || '';

// Create theme
const theme = createTheme({
  palette: {
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#dc004e',
    },
  },
});

// Initialize services
const calendarService = new CalendarService();
const emailService = new EmailService();
const schedulerService = new SchedulerService({
  minDuration: 15,
  maxDuration: 480,
  workingDays: [1, 2, 3, 4, 5], // Monday to Friday
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
});
const linkBuilder = new CalendarLinkBuilder();
const icsGenerator = new ICSGenerator();

const llmClient = new LLMClient({
  ollamaUrl: 'http://localhost:11434',
  ollamaModel: 'llama3.1:8b',
});

const toolDispatcher = new ToolDispatcher({
  calendarService,
  emailService,
  schedulerService,
  linkBuilder,
  icsGenerator,
  events: [],
});

function App() {
  // State
  const [authState, setAuthState] = useState<AuthState>({
    isSignedIn: false,
    isLoading: true,
    error: null,
  });
  const [calendarViewMode, setCalendarViewMode] = useState<'list' | 'calendar'>('calendar');
  const [chatInput, setChatInput] = useState('');
  const chatAreaRef = useRef<HTMLDivElement>(null);

  // Wrapper function to convert AuthButton callback to AuthState format
  const handleAuthChange = useCallback((isSignedIn: boolean, token?: string) => {
    setAuthState(prev => ({
      ...prev,
      isSignedIn,
      isLoading: false,
      error: null,
      user: isSignedIn ? {
        email: 'user@example.com', // Will be updated with real user info
        name: 'User',
      } : undefined,
    }));

    // Load chat history when user signs in
    if (isSignedIn) {
      const userEmail = 'user@example.com'; // This should be the actual user email
      // Load chat history will be handled after the functions are defined
      llmClient.loadHistoryFromStorage(userEmail);
    } else {
      // Clear chat history when user signs out
      setChatMessages([]);
      llmClient.clearHistory();
    }
  }, []);

  const [calendarState, setCalendarState] = useState<CalendarState>({
    events: [],
    isLoading: false,
    error: null,
    lastUpdated: null,
  });

  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [showRefreshDialog, setShowRefreshDialog] = useState(false);

  // Helper function to download ICS content
  const downloadICSContent = useCallback((icsContent: string, filename: string) => {
    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, []);

  // Helper function to download report content
  const downloadReportContent = useCallback((reportContent: string, filename: string) => {
    const blob = new Blob([reportContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, []);

  // Helper function to render messages with clickable links
  const renderMessageWithLinks = useCallback((text: string) => {
    // Split text by markdown-style links [text](url)
    const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
    const parts = [];
    let lastIndex = 0;
    let match;

    while ((match = linkRegex.exec(text)) !== null) {
      // Add text before the link
      if (match.index > lastIndex) {
        parts.push({
          type: 'text',
          content: text.slice(lastIndex, match.index)
        });
      }

      // Check if this is an ICS download link
      const linkText = match[1];
      const linkUrl = match[2];
      
      if (linkText.includes('📥 Download ICS') && linkUrl.startsWith('BEGIN:VCALENDAR')) {
        // This is an ICS content that should trigger download
        parts.push({
          type: 'icsDownload',
          text: linkText,
          icsContent: linkUrl,
          filename: `calendar_event_${Date.now()}.ics`
        });
      } else if (linkText.includes('📄 Download') && linkUrl.includes('TENEX CALENDAR PRODUCTIVITY REPORT')) {
        // This is a productivity report that should trigger download
        parts.push({
          type: 'reportDownload',
          text: linkText,
          reportContent: linkUrl,
          filename: linkText.match(/Download (.+?)$/)?.[1] || 'productivity_report.txt'
        });
      } else {
        // Regular link
        parts.push({
          type: 'link',
          text: linkText,
          url: linkUrl
        });
      }

      lastIndex = match.index + match[0].length;
    }

    // Add remaining text
    if (lastIndex < text.length) {
      parts.push({
        type: 'text',
        content: text.slice(lastIndex)
      });
    }

    return parts.map((part, index) => {
      if (part.type === 'link') {
        return (
          <a
            key={index}
            href={part.url}
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: 'inherit', textDecoration: 'underline' }}
          >
            {part.text}
          </a>
        );
      } else if (part.type === 'icsDownload') {
        return (
          <a
            key={index}
            href="#"
            onClick={(e) => {
              e.preventDefault();
              if (part.icsContent && part.filename) {
                downloadICSContent(part.icsContent, part.filename);
              }
            }}
            style={{ color: 'inherit', textDecoration: 'underline', cursor: 'pointer' }}
          >
            {part.text}
          </a>
        );
      } else if (part.type === 'reportDownload') {
        return (
          <a
            key={index}
            href="#"
            onClick={(e) => {
              e.preventDefault();
              if (part.reportContent && part.filename) {
                downloadReportContent(part.reportContent, part.filename);
              }
            }}
            style={{ color: 'inherit', textDecoration: 'underline', cursor: 'pointer' }}
          >
            {part.text}
          </a>
        );
      } else {
        return part.content;
      }
    });
  }, [downloadICSContent, downloadReportContent]);

  // Effects
  useEffect(() => {
    if (authState.isSignedIn && authState.user) {
      // Get the real access token from localStorage
      const accessToken = localStorage.getItem('google_access_token');
      
      if (accessToken) {
        console.log('Setting access tokens for services');
        calendarService.setAccessToken(accessToken);
        emailService.setAccessToken(accessToken);
        
        // Fetch initial events
        fetchEvents();
      } else {
        console.warn('No access token found, calendar access will be limited');
        // Set a mock token for now to prevent errors
        calendarService.setAccessToken('mock-access-token');
        emailService.setAccessToken('mock-access-token');
      }
    }
  }, [authState.isSignedIn]);

  // Load chat messages from localStorage when user signs in
  const loadChatHistory = useCallback((userEmail: string) => {
    try {
      const key = `tenex_calendar_ui_chat_history_${userEmail}`;
      const stored = localStorage.getItem(key);
      if (stored) {
        const messages = JSON.parse(stored);
        setChatMessages(messages);
        console.log(`📚 Loaded UI chat history for ${userEmail}: ${messages.length} messages`);
      }
    } catch (error) {
      console.warn('Failed to load UI chat history from storage:', error);
    }
  }, []);

  // Save chat messages to localStorage
  const saveChatHistory = useCallback((userEmail: string, messages: ChatMessage[]) => {
    try {
      const key = `tenex_calendar_ui_chat_history_${userEmail}`;
      localStorage.setItem(key, JSON.stringify(messages));
    } catch (error) {
      console.warn('Failed to save UI chat history to storage:', error);
    }
  }, []);

  // Clear chat history from localStorage
  const clearChatHistory = useCallback((userEmail: string) => {
    try {
      const key = `tenex_calendar_ui_chat_history_${userEmail}`;
      localStorage.removeItem(key);
      console.log(`🗑️ Cleared UI chat history for ${userEmail}`);
    } catch (error) {
      console.warn('Failed to clear UI chat history from storage:', error);
    }
  }, []);

  // Load chat history when user signs in and functions are available
  useEffect(() => {
    if (authState.isSignedIn && authState.user) {
      const userEmail = authState.user.email;
      loadChatHistory(userEmail);
    }
  }, [authState.isSignedIn, authState.user, loadChatHistory]);

  // Auto-scroll to bottom when new messages are added
  useEffect(() => {
    if (chatMessages.length > 0 && chatAreaRef.current) {
      const chatContainer = chatAreaRef.current.querySelector('[data-chat-messages]');
      if (chatContainer) {
        // Use setTimeout to ensure the DOM has updated
        setTimeout(() => {
          chatContainer.scrollTop = chatContainer.scrollHeight;
        }, 100);
      }
    }
  }, [chatMessages]);

  // Callbacks
  const fetchEvents = useCallback(async () => {
    if (!authState.isSignedIn) return;

    setCalendarState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const events = await calendarService.fetchEvents();
      const normalizedEvents = normalizeEvents(events);

      setCalendarState({
        events: normalizedEvents,
        isLoading: false,
        error: null,
        lastUpdated: new Date(),
      });

      // Update tool dispatcher context
      toolDispatcher['context'].events = normalizedEvents;
    } catch (error) {
      setCalendarState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to fetch events',
      }));
    }
  }, [authState.isSignedIn]);

  const handleSendMessage = useCallback(async (message: string) => {
    if (!authState.isSignedIn) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      sender: 'user',
      text: message,
      timestamp: new Date(),
    };

    setChatMessages(prev => {
      const newMessages = [...prev, userMessage];
      // Save updated messages to localStorage
      const userEmail = authState.user?.email || 'user@example.com';
      saveChatHistory(userEmail, newMessages);
      return newMessages;
    });
    setIsChatLoading(true);
    setChatError(null);

    // Add user message to LLM history
    const userEmail = authState.user?.email || 'user@example.com';
    llmClient.addToHistory('user', message, userEmail);

    try {
      // Get available tools
      const availableTools = toolDispatcher.getAvailableTools();
      const toolFunctions: FunctionCall[] = availableTools.map(tool => ({
        function: tool.name,
        parameters: tool.parameters,
      }));

      // Call LLM
      const response = await llmClient.chat(message, {
        events: calendarState.events,
      }, toolFunctions);

      let assistantMessage: ChatMessage;

      if (response.type === 'function_calls' && response.functionCalls) {
        // Execute function calls
        const results = await Promise.all(
          response.functionCalls.map(call => toolDispatcher.executeFunction(call, message))
        );

        // Generate a meaningful response based on the function results
        console.log('🔍 DEBUG functionResultsText processing results:', results);
        const functionResultsText = results.map((result, index) => {
          const functionName = response.functionCalls![index].function;
          console.log('🔍 DEBUG processing function:', functionName, 'with result:', result);
          
          if (functionName === 'generate_productivity_report' && result && typeof result === 'object') {
            const stats = result.stats;
            if (stats) {
              let reportText = `📊 **${result.reportType.charAt(0).toUpperCase() + result.reportType.slice(1)} Productivity Report Generated:**

• **Total Events**: ${stats.totalEvents} upcoming meetings/events
• **Total Time**: ${stats.totalHours} hours (${stats.totalMinutes} minutes)
• **Average Duration**: ${Math.round(stats.averageDuration)} minutes per event
• **Most Active Day**: ${stats.mostActiveDay}
• **Most Active Time**: ${stats.mostActiveTime}`;

              if (result.recommendations && result.recommendations.length > 0) {
                reportText += `\n\n💡 **Recommendations:**
${result.recommendations.map((rec: string) => `• ${rec}`).join('\n')}`;
              }

              if (result.reportContent && result.filename) {
                reportText += `\n\n📥 **Download Report:**
• [📄 Download ${result.filename}](${result.reportContent})`;
              }

              reportText += `\n\n*${result.instructions}*`;

              return reportText;
            }
          }
          
          if (functionName === 'suggest_meeting_times' && result && typeof result === 'object') {
            const proposals = result.proposals;
            if (proposals && Array.isArray(proposals)) {
              if (proposals.length === 0) {
                return `📅 **Meeting Time Suggestions**: No available time slots found for your requested duration. Consider adjusting the time or duration.`;
              }
              
              let suggestionsText = `📅 **Meeting Proposals for "${result.meetingTitle}"**:\n\n`;
              suggestionsText += `**Duration:** ${result.duration} minutes\n`;
              suggestionsText += `**Attendees:** ${result.attendees.join(', ') || 'None'}\n\n`;
              
              proposals.slice(0, 5).forEach((proposal: any, index: number) => {
                const startTime = new Date(proposal.start).toLocaleString();
                suggestionsText += `**Slot ${proposal.slotNumber}:** ${startTime}\n`;
                suggestionsText += `• [📅 Create in Calendar](${proposal.calendarUrl})\n`;
                suggestionsText += `• [📥 Download ICS](${proposal.icsContent})\n\n`;
              });
              
              if (proposals.length > 5) {
                suggestionsText += `\n... and ${proposals.length - 5} more options available.`;
              }
              
              suggestionsText += `\n*${result.instructions}*`;
              
              return suggestionsText;
            }
          }

          if (functionName === 'create_email_draft' && result && typeof result === 'object') {
            // Handle group email for all recipients
            if (result.emailType === 'group_meeting_scheduling' && result.calendarLinks) {
              let emailText = `📧 **${result.message}**\n\n`;
              
              // Show the single group email template
              emailText += `**Subject:** ${result.emailTemplate.subject}\n\n`;
              emailText += `**Body:**\n${result.emailTemplate.body}\n\n`;
              
              // Show single calendar link for all recipients
              const link = result.calendarLinks[0];
              emailText += `**Calendar Link (All Recipients):**\n`;
              emailText += `**To:** ${link.recipients}\n`;
              emailText += `• [📧 Open in Gmail](${link.gmailComposeUrl})\n`;
              emailText += `• [📮 Use Mailto Link](${link.mailtoUrl})\n\n`;
              
              emailText += `*${result.instructions}*`;
              return emailText;
            }
            
            // Handle multiple email drafts for meeting scheduling
            if (result.emailType === 'multiple_meeting_scheduling' && result.calendarLinks) {
              let emailText = `📧 **${result.message}**\n\n`;
              
              // Show the email template once (using the first template as they're all the same except for names)
              const firstTemplate = result.emailTemplates[0];
              emailText += `**Subject:** ${firstTemplate.subject}\n\n`;
              emailText += `**Body:**\n${firstTemplate.body}\n\n`;
              
              // Show calendar links for each recipient
              emailText += `**Calendar Links for Each Recipient:**\n`;
              result.calendarLinks.forEach((link: any, index: number) => {
                emailText += `**${index + 1}. ${link.recipient}**\n`;
                emailText += `• [📧 Open in Gmail](${link.gmailComposeUrl})\n`;
                emailText += `• [📮 Use Mailto Link](${link.mailtoUrl})\n\n`;
              });
              
              emailText += `*${result.instructions}*`;
              return emailText;
            }
            
            // Handle single email draft
            let emailText = `📧 **Email Draft Generated**\n\n`;
            emailText += `**To:** ${result.recipient}\n`;
            emailText += `**Subject:** ${result.subject}\n\n`;
            emailText += `**Body:**\n${result.body}\n\n`;
            emailText += `**Actions:**\n`;
            emailText += `• [📧 Open in Gmail](${result.gmailComposeUrl})\n`;
            emailText += `• [📮 Use Mailto Link](${result.mailtoUrl})\n\n`;
            emailText += `*${result.instructions}*`;
            
            return emailText;
          }

          if (functionName === 'create_calendar_event' && result && typeof result === 'object') {
            const startTime = new Date(result.startTime).toLocaleString();
            const endTime = new Date(result.endTime).toLocaleString();
            
            let eventText = `${result.message}\n\n`;
            eventText += `**Event:** ${result.title}\n`;
            eventText += `**Time:** ${startTime} - ${endTime}\n`;
            eventText += `**Duration:** ${result.duration} minutes\n`;
            if (result.attendees && result.attendees.length > 0) {
              eventText += `**Attendees:** ${result.attendees.join(', ')}\n`;
            }
            if (result.location) {
              eventText += `**Location:** ${result.location}\n`;
            }
            if (result.description) {
              eventText += `**Description:** ${result.description}\n`;
            }
            
            if (result.calendarUrl || result.calendarLink) {
              const calendarLink = result.calendarUrl || result.calendarLink;
              eventText += `\n**Actions:**\n`;
              eventText += `• [📅 View in Google Calendar](${calendarLink})\n`;
              
              if (result.icsContent) {
                eventText += `• [📥 Download ICS File](${result.icsContent})\n`;
              }
            }
            
            eventText += `\n*${result.instructions}*`;
            
            return eventText;
          }
          
          if (functionName === 'create_calendar_link' && result && typeof result === 'object') {
            console.log('🔍 DEBUG create_calendar_link result:', result);
            const startTime = new Date(result.startTime).toLocaleString();
            const endTime = new Date(result.endTime).toLocaleString();
            
            let linkText = `${result.message}\n\n`;
            linkText += `**Event:** ${result.title}\n`;
            linkText += `**Time:** ${startTime} - ${endTime}\n`;
            linkText += `**Duration:** ${result.duration} minutes\n`;
            if (result.attendees && result.attendees.length > 0) {
              linkText += `**Attendees:** ${result.attendees.join(', ')}\n`;
            }
            if (result.location) {
              linkText += `**Location:** ${result.location}\n`;
            }
            if (result.description) {
              linkText += `**Description:** ${result.description}\n`;
            }
            
            if (result.calendarUrl) {
              linkText += `\n**Actions:**\n`;
              linkText += `• [📅 View in Google Calendar](${result.calendarUrl})\n`;
              
              if (result.icsContent) {
                linkText += `• [📥 Download ICS File](${result.icsContent})\n`;
              }
            }
            
            linkText += `\n*${result.instructions}*`;
            
            return linkText;
          }
          
          if (functionName === 'create_meeting_followup' && result && typeof result === 'object') {
            console.log('🔍 DEBUG create_meeting_followup result:', result);
            
            // Handle error case (event not found)
            if (result.error) {
              return result.instructions;
            }
            
            // Handle successful case (event found)
            let followupText = `📧 **Meeting Follow-up Email Generated**\n\n`;
            followupText += `**Subject:** ${result.subject}\n\n`;
            followupText += `**Email Body:**\n${result.body}\n\n`;
            
            followupText += `**Instructions:**\n`;
            followupText += `• Copy the subject and body above\n`;
            followupText += `• Open your email client (Gmail, Outlook, etc.)\n`;
            followupText += `• Paste the content and send to the appropriate recipient\n\n`;
            
            followupText += `*This is a draft email template. You can edit it before sending.*`;
            
            return followupText;
          }
          
          if (functionName === 'fetch_events' && result && typeof result === 'object' && result.message) {
            // Use the formatted message from fetch_events
            return result.message;
          }
          
          if (functionName === 'create_email_template' && result && typeof result === 'object') {
            let templateText = `📧 **Email Template Generated**\n\n`;
            
            if (result.templateType) {
              templateText += `**Template Type:** ${result.templateType}\n\n`;
            }
            
            if (result.subject) {
              templateText += `**Subject:** ${result.subject}\n\n`;
            }
            
            if (result.body) {
              templateText += `**Body:**\n${result.body}\n\n`;
            }
            
            if (result.instructions) {
              templateText += `*${result.instructions}*`;
            }
            
            return templateText;
          }
          
          if (functionName === 'optimize_schedule' && result && typeof result === 'object') {
            let optimizationText = `🚀 **Schedule Optimization Results**\n\n`;
            
            if (result.focus) {
              optimizationText += `**Focus Area:** ${result.focus.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())}\n\n`;
            }
            
            if (result.suggestions && Array.isArray(result.suggestions)) {
              optimizationText += `**Optimization Suggestions:**\n`;
              result.suggestions.forEach((suggestion: string, index: number) => {
                optimizationText += `${index + 1}. ${suggestion}\n`;
              });
              optimizationText += `\n`;
            }
            
            if (result.generatedAt) {
              optimizationText += `*Analysis generated at: ${new Date(result.generatedAt).toLocaleString()}*`;
            }
            
            return optimizationText;
          }
          
          if (Array.isArray(result) && result.length > 0) {
            return `✅ Successfully executed ${functionName}. Found ${result.length} results.`;
          } else if (result && typeof result === 'object') {
            return `✅ Successfully executed ${functionName}.`;
          } else {
            return `✅ Successfully executed ${functionName}.`;
          }
        }).join('\n\n');

        assistantMessage = {
          id: (Date.now() + 1).toString(),
          sender: 'agent',
          text: functionResultsText || 'Function calls executed successfully.',
          timestamp: new Date(),
          functionCalls: response.functionCalls,
        };
      } else {
        assistantMessage = {
          id: (Date.now() + 1).toString(),
          sender: 'agent',
          text: response.content || 'I apologize, but I encountered an error processing your request.',
          timestamp: new Date(),
        };
      }

      setChatMessages(prev => {
        const newMessages = [...prev, assistantMessage];
        // Save updated messages to localStorage
        const userEmail = authState.user?.email || 'user@example.com';
        saveChatHistory(userEmail, newMessages);
        return newMessages;
      });
      
      // Add assistant response to LLM history
      const responseText = response.type === 'function_calls' 
        ? assistantMessage.text 
        : (response.content || 'I apologize, but I encountered an error processing your request.');
      const userEmail = authState.user?.email || 'user@example.com';
      llmClient.addToHistory('assistant', responseText, userEmail);
      
    } catch (error) {
      setChatError(error instanceof Error ? error.message : 'Failed to process message');
    } finally {
      setIsChatLoading(false);
    }
  }, [authState.isSignedIn, calendarState.events]);

  const handleClearHistory = useCallback(() => {
    setChatMessages([]);
    setChatError(null);
    // Also clear the LLM client's conversation history
    const userEmail = authState.user?.email || 'user@example.com';
    llmClient.clearHistory(userEmail);
    clearChatHistory(userEmail);
  }, [authState.user?.email, clearChatHistory]);

  const handleRefreshChat = useCallback(() => {
    setShowRefreshDialog(true);
  }, []);

  const handleConfirmRefresh = useCallback(() => {
    setChatMessages([]);
    setChatError(null);
    // Clear the LLM client's conversation history
    const userEmail = authState.user?.email || 'user@example.com';
    llmClient.clearHistory(userEmail);
    clearChatHistory(userEmail);
    setShowRefreshDialog(false);
  }, [authState.user?.email, clearChatHistory]);

  const handleCancelRefresh = useCallback(() => {
    setShowRefreshDialog(false);
  }, []);

  const scrollToChat = useCallback(() => {
    if (chatAreaRef.current) {
      chatAreaRef.current.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'start' 
      });
    }
  }, []);

  const scrollToBottom = useCallback(() => {
    if (chatAreaRef.current) {
      const chatContainer = chatAreaRef.current.querySelector('[data-chat-messages]');
      if (chatContainer) {
        chatContainer.scrollTop = chatContainer.scrollHeight;
      }
    }
  }, []);

  const handleChatScroll = useCallback((event: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = event.currentTarget;
    const isNearBottom = scrollHeight - scrollTop - clientHeight < 50;
    setShowScrollButton(!isNearBottom);
  }, []);

  const handleSuggestionClick = useCallback((suggestion: Suggestion) => {
    // Convert suggestion to a chat message
    const message = `Help me with: ${suggestion.title}`;
    handleSendMessage(message);
    // Scroll to chat area after a short delay to ensure message is sent
    setTimeout(() => {
      scrollToChat();
    }, 100);
  }, [handleSendMessage, scrollToChat]);

  const handleEventClick = useCallback((event: NormalizedEvent) => {
    // Open event in calendar
    const url = linkBuilder.createEventUrl(event);
    window.open(url, '_blank');
  }, []);

  // Render welcome screen for non-authenticated users
  if (!authState.isSignedIn) {
    return (
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <Box
          sx={{
            minHeight: '100vh',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            p: { xs: 2, sm: 3 },
            position: 'relative',
            overflow: 'hidden',
            '&::before': {
              content: '""',
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'url("data:image/svg+xml,%3Csvg width="60" height="60" viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg"%3E%3Cg fill="none" fill-rule="evenodd"%3E%3Cg fill="%23ffffff" fill-opacity="0.05"%3E%3Ccircle cx="30" cy="30" r="2"/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")',
              opacity: 0.3,
            }
          }}
        >
          <Box
            sx={{
              bgcolor: 'background.paper',
              borderRadius: 4,
              p: { xs: 3, sm: 4, md: 5 },
              boxShadow: '0 20px 40px rgba(0,0,0,0.1)',
              maxWidth: { xs: '90%', sm: 450, md: 500 },
              width: '100%',
              textAlign: 'center',
              position: 'relative',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(255,255,255,0.2)',
              animation: 'slideUp 0.6s ease-out',
              '@keyframes slideUp': {
                '0%': { opacity: 0, transform: 'translateY(30px)' },
                '100%': { opacity: 1, transform: 'translateY(0)' },
              }
            }}
          >
            <Box
              sx={{
                width: 80,
                height: 80,
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #1976d2 0%, #42a5f5 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                mx: 'auto',
                mb: 3,
                boxShadow: '0 8px 32px rgba(25, 118, 210, 0.3)',
              }}
            >
              <CalendarIcon sx={{ fontSize: 40, color: 'white' }} />
            </Box>
            
            <Typography 
              variant="h3" 
              component="h1" 
              gutterBottom
              sx={{ 
                fontWeight: 700,
                background: 'linear-gradient(135deg, #1976d2 0%, #42a5f5 100%)',
                backgroundClip: 'text',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                mb: 2
              }}
            >
              TenexCalendar
            </Typography>
            
            <Typography 
              variant="h6" 
              color="text.secondary" 
              sx={{ 
                mb: 4,
                lineHeight: 1.6,
                fontWeight: 400
              }}
            >
              Your intelligent calendar companion. Manage events, create email drafts, and get productivity insights with AI assistance.
            </Typography>
            
            {authState.error && (
              <Alert 
                severity="error" 
                sx={{ 
                  mb: 3,
                  borderRadius: 2,
                  '& .MuiAlert-icon': { alignItems: 'center' }
                }}
              >
                {authState.error}
              </Alert>
            )}

            <Box sx={{ position: 'relative' }}>
            <AuthButton onAuthChange={handleAuthChange} />
              
              {/* Feature highlights */}
              <Box 
                sx={{ 
                  display: 'flex', 
                  justifyContent: 'center', 
                  gap: 3, 
                  mt: 4,
                  flexWrap: 'wrap'
                }}
              >
                {[
                  { icon: '📅', text: 'Smart Scheduling' },
                  { icon: '📧', text: 'Email Templates' },
                  { icon: '📊', text: 'Analytics' },
                  { icon: '🤖', text: 'AI Assistant' }
                ].map((feature, index) => (
                  <Box
                    key={index}
                    sx={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: 1,
                      opacity: 0.8,
                      transition: 'opacity 0.2s',
                      '&:hover': { opacity: 1 }
                    }}
                  >
                    <Typography variant="h4">{feature.icon}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {feature.text}
                    </Typography>
                  </Box>
                ))}
              </Box>
            </Box>
          </Box>
        </Box>
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
        {/* App Bar */}
        <AppBar 
          position="static" 
          elevation={0}
          sx={{ 
            borderBottom: '1px solid',
            borderColor: 'divider',
            backgroundColor: 'background.paper',
            color: 'text.primary'
          }}
        >
          <Toolbar sx={{ px: { xs: 2, md: 3 } }}>
            <Box 
              sx={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: 1.5,
                flexGrow: 1 
              }}
            >
              <Box
                sx={{
                  width: 40,
                  height: 40,
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #1976d2 0%, #42a5f5 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 4px 16px rgba(25, 118, 210, 0.3)',
                }}
              >
                <CalendarIcon sx={{ fontSize: 20, color: 'white' }} />
              </Box>
              <Typography 
                variant="h6" 
                component="div" 
                sx={{ 
                  fontWeight: 600,
                  background: 'linear-gradient(135deg, #1976d2 0%, #42a5f5 100%)',
                  backgroundClip: 'text',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  display: { xs: 'none', sm: 'block' }
                }}
              >
                TenexCalendar
            </Typography>
            </Box>
            
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <AuthButton onAuthChange={handleAuthChange} />
            </Box>
          </Toolbar>
        </AppBar>

        {/* Main Content */}
        <Container 
          maxWidth="xl" 
          sx={{ 
            flex: 1, 
            py: { xs: 2, md: 3 },
            px: { xs: 2, md: 3 }
          }}
        >
          {/* Search Bar with Integrated Chat */}
          <Box sx={{ mb: 3 }} ref={chatAreaRef}>
            <Paper
              sx={{
                p: 2,
                borderRadius: 3,
                boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
                border: '1px solid',
                borderColor: 'divider',
                transition: 'all 0.3s ease',
              }}
            >
              {/* Search Input Section */}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: chatMessages.length > 0 ? 2 : 0 }}>
                <EnergyBallIcon />
                <Box sx={{ flex: 1 }}>
                  <TextField
                    fullWidth
                    placeholder="Ask me anything about your calendar, schedule meetings, or get productivity insights..."
                    variant="outlined"
                    size="medium"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter' && chatInput.trim()) {
                        handleSendMessage(chatInput.trim());
                        setChatInput('');
                      }
                    }}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <SearchIcon sx={{ color: 'text.secondary' }} />
                        </InputAdornment>
                      ),
                      endAdornment: (
                        <InputAdornment position="end">
                          {chatMessages.length > 0 && (
                            <IconButton
                              onClick={handleRefreshChat}
                              disabled={isChatLoading}
                              color="secondary"
                              size="small"
                              sx={{ mr: 1 }}
                            >
                              <RefreshIcon />
                            </IconButton>
                          )}
                          <IconButton
                            onClick={() => {
                              if (chatInput.trim()) {
                                handleSendMessage(chatInput.trim());
                                setChatInput('');
                              }
                            }}
                            disabled={!chatInput.trim() || isChatLoading}
                            color="primary"
                            size="small"
                          >
                            {isChatLoading ? <CircularProgress size={20} /> : <SendIcon />}
                          </IconButton>
                        </InputAdornment>
                      ),
                    }}
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        borderRadius: 2,
                        backgroundColor: 'background.paper',
                        '&:hover': {
                          backgroundColor: 'action.hover',
                        },
                        '&.Mui-focused': {
                          backgroundColor: 'background.paper',
                        },
                      },
                    }}
                  />
                  {chatMessages.length === 0 && (
                    <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                      Press Enter to ask or use the send button
                    </Typography>
                  )}
                </Box>
              </Box>

              {/* Chat Messages Section - Only show when there are messages */}
              {chatMessages.length > 0 && (
                <Box sx={{ position: 'relative' }}>
                  <Box
                    data-chat-messages
                    onScroll={handleChatScroll}
                    sx={{
                      borderTop: '1px solid',
                      borderColor: 'divider',
                      pt: 2,
                      maxHeight: 400,
                      minHeight: 150,
                      overflowY: 'auto',
                      scrollBehavior: 'smooth',
                      px: 1, // Add some horizontal padding
                      '&::-webkit-scrollbar': {
                        width: '8px',
                      },
                      '&::-webkit-scrollbar-track': {
                        background: 'rgba(0,0,0,0.05)',
                        borderRadius: '4px',
                      },
                      '&::-webkit-scrollbar-thumb': {
                        background: 'rgba(0,0,0,0.2)',
                        borderRadius: '4px',
                        '&:hover': {
                          background: 'rgba(0,0,0,0.3)',
                        },
                      },
                      // Ensure proper spacing for messages
                      '& > *:not(:last-child)': {
                        mb: 2,
                      },
                    }}
                  >
                  {chatMessages.map((message, index) => (
                    <Box key={message.id} sx={{ mb: index < chatMessages.length - 1 ? 2 : 0 }}>
                      {message.sender === 'user' ? (
                        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 1 }}>
                          <Paper
                            sx={{
                              p: 1.5,
                              backgroundColor: 'primary.main',
                              color: 'white',
                              borderRadius: 2,
                              maxWidth: '80%',
                            }}
                          >
                            <Typography variant="body2">{message.text}</Typography>
                          </Paper>
                        </Box>
                      ) : (
                        <Box sx={{ display: 'flex', justifyContent: 'flex-start', mb: 1 }}>
                          <Paper
                            sx={{
                              p: 1.5,
                              backgroundColor: 'white',
                              border: '1px solid',
                              borderColor: 'divider',
                              borderRadius: 2,
                              maxWidth: '80%',
                            }}
                          >
                            <Box sx={{ 
                              '& a': { 
                                color: 'primary.main', 
                                textDecoration: 'none',
                                '&:hover': { textDecoration: 'underline' }
                              },
                              '& strong': { fontWeight: 'bold' },
                              '& em': { fontStyle: 'italic' }
                            }}>
                              {renderMessageWithLinks(message.text)}
                            </Box>
                            {message.functionCalls && message.functionCalls.length > 0 && (
                              <Box sx={{ mt: 1, pt: 1, borderTop: '1px solid', borderColor: 'divider' }}>
                                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                                  Actions taken:
                                </Typography>
                                {message.functionCalls.map((call, callIndex) => (
                                  <Chip
                                    key={callIndex}
                                    label={call.function}
                                    size="small"
                                    variant="outlined"
                                    sx={{ mr: 0.5, mb: 0.5 }}
                                  />
                                ))}
                              </Box>
                            )}
                          </Paper>
                        </Box>
                      )}
                    </Box>
                  ))}
                  
                  {isChatLoading && (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'text.secondary', mt: 1 }}>
                      <EnergyBallIcon size="small" />
                      <Typography variant="body2">AI is thinking...</Typography>
                    </Box>
                  )}
                  </Box>
                  
                  {/* Scroll to bottom button */}
                  {showScrollButton && (
                    <Box
                      sx={{
                        position: 'absolute',
                        bottom: 16,
                        right: 16,
                        zIndex: 1,
                      }}
                    >
                      <IconButton
                        onClick={scrollToBottom}
                        sx={{
                          backgroundColor: 'primary.main',
                          color: 'white',
                          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                          '&:hover': {
                            backgroundColor: 'primary.dark',
                          },
                        }}
                        size="small"
                      >
                        <KeyboardArrowDownIcon />
                      </IconButton>
                    </Box>
                  )}
                </Box>
              )}
            </Paper>
          </Box>

          {/* Calendar Section - Full Width */}
          <Box sx={{ mb: 3 }}>
            {/* Calendar View Toggle */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h5" component="h2" sx={{ fontWeight: 600 }}>
                Calendar
              </Typography>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button
                  variant={calendarViewMode === 'calendar' ? 'contained' : 'outlined'}
                  size="small"
                  onClick={() => setCalendarViewMode('calendar')}
                  startIcon={<ViewModuleIcon />}
                >
                  Calendar View
                </Button>
                <Button
                  variant={calendarViewMode === 'list' ? 'contained' : 'outlined'}
                  size="small"
                  onClick={() => setCalendarViewMode('list')}
                  startIcon={<ViewListIcon />}
                >
                  List View
                </Button>
              </Box>
            </Box>

            {/* Calendar Content */}
            {calendarViewMode === 'list' ? (
              <CalendarList
                events={calendarState.events}
                isLoading={calendarState.isLoading}
                error={calendarState.error}
                onRefresh={fetchEvents}
                onEventClick={handleEventClick}
              />
            ) : (
              <CalendarView
                events={calendarState.events}
                onEventClick={handleEventClick}
                onRefresh={fetchEvents}
              />
            )}
          </Box>

          {/* Analytics and Suggestions Section */}
          <Box sx={{ display: 'flex', flexDirection: { xs: 'column', lg: 'row' }, gap: { xs: 2, md: 3 } }}>
              {/* Analytics Panel */}
            <Box sx={{ flex: 1 }}>
              <AnalyticsPanel
                events={calendarState.events}
                onRefresh={fetchEvents}
                />
              </Box>

              {/* Suggestions */}
            <Box sx={{ flex: 1 }}>
              <SuggestionPicker
                events={calendarState.events}
                onSuggestionClick={handleSuggestionClick}
                onRefresh={fetchEvents}
              />
            </Box>
          </Box>
        </Container>
      </Box>

      {/* Refresh Chat Confirmation Dialog */}
      <Dialog
        open={showRefreshDialog}
        onClose={handleCancelRefresh}
        aria-labelledby="refresh-dialog-title"
        aria-describedby="refresh-dialog-description"
      >
        <DialogTitle id="refresh-dialog-title">
          Refresh Chat Conversation
        </DialogTitle>
        <DialogContent>
          <DialogContentText id="refresh-dialog-description">
            Are you sure you want to refresh the chat? This will clear the current conversation and you will lose all chat history.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCancelRefresh} color="primary">
            Cancel
          </Button>
          <Button onClick={handleConfirmRefresh} color="error" variant="contained">
            Refresh Chat
          </Button>
        </DialogActions>
      </Dialog>
    </ThemeProvider>
  );
}

export default App;
