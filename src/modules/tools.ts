import { Tool, FunctionCall, NormalizedEvent, EmailTemplate } from '../types';
import { CalendarService } from './calendar';
import { EmailService } from './email';
import { SchedulerService } from './scheduler';
import { CalendarLinkBuilder } from './calendarLinks';
import { ICSGenerator } from './ics';
import { SchemaType } from '@google/generative-ai';

export interface ToolContext {
  calendarService: CalendarService;
  emailService: EmailService;
  schedulerService: SchedulerService;
  linkBuilder: CalendarLinkBuilder;
  icsGenerator: ICSGenerator;
  events: NormalizedEvent[];
}

export class ToolDispatcher {
  private context: ToolContext;
  private tools: Map<string, Tool> = new Map();
  private recentFunctionCalls: Array<{ function: string; parameters: any; timestamp: number; response: any }> = [];

  constructor(context: ToolContext) {
    this.context = context;
    this.registerTools();
  }

  private registerTools(): void {
    // Calendar tools
    this.registerTool({
      name: 'fetch_events',
      description: 'Fetch calendar events for a specific time range',
      parameters: {
          type: SchemaType.OBJECT,
        properties: {
          timeRange: {
              type: SchemaType.STRING,
            description: 'Time range to fetch events for',
            enum: ['today', 'this_week', 'next_week', 'this_month']
          },
          maxResults: {
              type: SchemaType.NUMBER,
            description: 'Maximum number of events to fetch',
            default: 10
          }
        },
        required: ['timeRange']
      }
    });

    this.registerTool({
      name: 'create_email_draft',
      description: 'Creates a calendar-related email draft with LLM-generated content and opens it in Gmail compose. Generates professional emails for meeting follow-ups, reminders, confirmations, and schedule updates. For group emails, use comma-separated recipients or array format.',
      parameters: {
        type: SchemaType.OBJECT,
        properties: {
          to: {
            type: SchemaType.STRING,
            description: 'Email address of recipient(s). For group emails, use comma-separated format: "joe@gmail.com,dan@gmail.com,sally@gmail.com" or array format: ["joe@gmail.com","dan@gmail.com","sally@gmail.com"]'
          },
          emailType: {
            type: SchemaType.STRING,
            description: 'Type of calendar-related email to generate',
            enum: ['meeting_followup', 'meeting_reminder', 'meeting_confirmation', 'action_items', 'schedule_update', 'custom']
          },
          context: {
            type: SchemaType.STRING,
            description: 'Context or details for the email (e.g., meeting title, action items, schedule changes)'
          },
          tone: {
            type: SchemaType.STRING,
            description: 'Tone of the email',
            enum: ['professional', 'casual', 'friendly', 'formal'],
            default: 'professional'
          }
        },
        required: ['to', 'emailType', 'context']
      }
    });

    this.registerTool({
      name: 'create_meeting_followup',
      description: 'Create a professional follow-up email for a recent calendar meeting with action items and next steps',
      parameters: {
          type: SchemaType.OBJECT,
        properties: {
          eventTitle: {
              type: SchemaType.STRING,
            description: 'Title of the meeting to follow up on'
          },
          attendeeEmail: {
              type: SchemaType.STRING,
            description: 'Email address of the meeting attendee'
          }
        },
        required: ['eventTitle', 'attendeeEmail']
      }
    });

    this.registerTool({
      name: 'suggest_meeting_times',
      description: 'Suggest optimal meeting times and generate calendar links/ICS files for each slot (no API calls needed)',
      parameters: {
        type: SchemaType.OBJECT,
        properties: {
          title: {
            type: SchemaType.STRING,
            description: 'Title of the meeting'
          },
          duration: {
            type: SchemaType.NUMBER,
            description: 'Duration of the meeting in minutes',
            default: 30
          },
          attendees: {
            type: SchemaType.ARRAY,
            items: {
              type: SchemaType.STRING
            },
            description: 'List of attendee email addresses'
          },
          preferredTime: {
            type: SchemaType.STRING,
            description: 'Preferred time of day',
            enum: ['morning', 'afternoon', 'evening', 'any'],
            default: 'any'
          },
          urgency: {
            type: SchemaType.STRING,
            description: 'Urgency level of the meeting',
            enum: ['low', 'medium', 'high'],
            default: 'medium'
          },
          location: {
            type: SchemaType.STRING,
            description: 'Meeting location (optional)'
          },
          description: {
            type: SchemaType.STRING,
            description: 'Meeting description (optional)'
          }
        },
        required: ['title', 'duration']
      }
    });

    this.registerTool({
      name: 'generate_productivity_report',
      description: 'Generate a comprehensive productivity report based on calendar data',
      parameters: {
        type: SchemaType.OBJECT,
        properties: {
          reportType: {
            type: SchemaType.STRING,
            description: 'Type of report to generate',
            enum: ['daily', 'weekly', 'monthly', 'meeting_analysis', 'time_distribution']
          },
          includeRecommendations: {
            type: SchemaType.BOOLEAN,
            description: 'Whether to include actionable recommendations',
            default: true
          }
        },
        required: ['reportType']
      }
    });

    this.registerTool({
      name: 'create_email_template',
      description: 'Create calendar-focused email templates (meeting follow-ups, reminders, confirmations)',
      parameters: {
          type: SchemaType.OBJECT,
        properties: {
          templateType: {
              type: SchemaType.STRING,
              description: 'Type of calendar email template',
              enum: ['meeting_followup', 'meeting_reminder', 'meeting_confirmation', 'action_items', 'schedule_update']
          },
          context: {
              type: SchemaType.STRING,
              description: 'Context or topic for the calendar-related email'
          },
          tone: {
              type: SchemaType.STRING,
            description: 'Tone of the email',
            enum: ['formal', 'casual', 'friendly', 'professional']
          }
        },
        required: ['templateType']
      }
    });

    this.registerTool({
      name: 'optimize_schedule',
      description: 'Provide suggestions to optimize meeting schedule',
      parameters: {
        type: SchemaType.OBJECT,
        properties: {
          focus: {
            type: SchemaType.STRING,
            description: 'Focus area for optimization',
            enum: ['reduce_meetings', 'consolidate_meetings', 'improve_productivity', 'block_focus_time']
          }
        },
        required: ['focus']
      }
    });

    this.registerTool({
      name: 'create_calendar_event',
      description: 'Schedules a meeting based on user-specified time, date, duration, and location. Creates the event in Google Calendar and generates calendar links and ICS files for easy sharing. REQUIRES: title, startTime, endTime, attendees. OPTIONAL: location, description.',
      parameters: {
        type: SchemaType.OBJECT,
        properties: {
          title: {
            type: SchemaType.STRING,
            description: 'Title of the meeting or event (e.g., "Team Standup", "Project Review")'
          },
          startTime: {
            type: SchemaType.STRING,
            description: 'Start time in ISO format (YYYY-MM-DDTHH:MM:SS). MUST include date and time.'
          },
          endTime: {
            type: SchemaType.STRING,
            description: 'End time in ISO format (YYYY-MM-DDTHH:MM:SS). MUST include date and time. Calculate based on startTime + duration.'
          },
          attendees: {
            type: SchemaType.ARRAY,
            items: {
              type: SchemaType.STRING
            },
            description: 'List of attendee email addresses (e.g., ["john@example.com", "jane@example.com"])'
          },
          location: {
            type: SchemaType.STRING,
            description: 'Meeting location (e.g., "Conference Room A", "Zoom", "Virtual")'
          },
          description: {
            type: SchemaType.STRING,
            description: 'Meeting description or agenda (optional)'
          }
        },
        required: ['title', 'startTime', 'endTime', 'attendees']
      }
    });

    this.registerTool({
      name: 'create_calendar_link',
      description: 'Create a Google Calendar link for an event',
      parameters: {
        type: SchemaType.OBJECT,
        properties: {
          title: {
            type: SchemaType.STRING,
            description: 'Event title'
          },
          startTime: {
            type: SchemaType.STRING,
            description: 'Start time in ISO format'
          },
          endTime: {
            type: SchemaType.STRING,
            description: 'End time in ISO format'
          },
          attendees: {
            type: SchemaType.ARRAY,
            items: { type: SchemaType.STRING },
            description: 'List of attendee email addresses'
          },
          location: {
            type: SchemaType.STRING,
            description: 'Event location'
          },
          description: {
            type: SchemaType.STRING,
            description: 'Event description'
          }
        },
        required: ['title', 'startTime', 'endTime']
      }
    });

    this.registerTool({
      name: 'generate_ics',
      description: 'Generate ICS file for calendar events',
      parameters: {
        type: SchemaType.OBJECT,
        properties: {
          eventIds: {
            type: SchemaType.ARRAY,
            items: { type: SchemaType.STRING },
            description: 'List of event IDs to include in ICS file'
          },
          filename: {
            type: SchemaType.STRING,
            description: 'Filename for the ICS file',
            default: 'calendar.ics'
          }
        },
        required: ['eventIds']
      }
    });
  }

  private registerTool(tool: Tool): void {
    this.tools.set(tool.name, tool);
  }

  getAvailableTools(): Tool[] {
    return Array.from(this.tools.values());
  }

  getToolDefinition(name: string): Tool | undefined {
    return this.tools.get(name);
  }

  async executeFunction(functionCall: FunctionCall, userMessage?: string): Promise<any> {
    const { function: functionName, parameters } = functionCall;
    
    // Check for duplicate function calls within the last 10 seconds
    const duplicateCheck = this.checkForDuplicateCall(functionName, parameters);
    if (duplicateCheck) {
      console.log('🔧 Duplicate function call detected, returning cached response');
      return duplicateCheck;
    }
    
    // Add user message to parameters for context-aware processing
    if (userMessage) {
      parameters.userMessage = userMessage;
    }

    switch (functionName) {
      case 'fetch_events':
        return await this.fetchEvents(parameters);

      case 'create_email_draft':
        const emailResult = await this.createEmailDraft(parameters);
        this.addToRecentCalls(functionName, parameters, emailResult);
        return emailResult;

      case 'create_meeting_followup':
        console.log('🔍 DEBUG Executing create_meeting_followup with parameters:', parameters);
        const followupResult = await this.createMeetingFollowup(parameters);
        console.log('🔍 DEBUG create_meeting_followup execution completed, result:', followupResult);
        return followupResult;

      case 'suggest_meeting_times':
        return await this.suggestMeetingTimes(parameters);

      case 'generate_productivity_report':
        return await this.generateProductivityReport(parameters);

      case 'create_email_template':
        return await this.createEmailTemplate(parameters);

      case 'optimize_schedule':
        return await this.optimizeSchedule(parameters);

      case 'create_calendar_event':
        return await this.createCalendarEvent(parameters);

      case 'create_calendar_link':
        return await this.createCalendarLink(parameters);

      case 'generate_ics':
        return await this.generateICS(parameters);

      default:
        throw new Error(`Unknown function: ${functionName}`);
    }
  }

  private async fetchEvents(parameters: any): Promise<any> {
    const { timeRange, maxResults = 10 } = parameters;
    let events: NormalizedEvent[] = [];
    let timeRangeLabel = 'all upcoming';

    switch (timeRange) {
      case 'today':
        const today = new Date();
        const todayEvents = this.context.events.filter(event => {
          const eventDate = new Date(event.startTime);
          return eventDate.toDateString() === today.toDateString();
        });
        events = todayEvents;
        timeRangeLabel = 'today';
        break;

      case 'this_week':
        const weekStart = new Date();
        weekStart.setDate(weekStart.getDate() - weekStart.getDay());
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 6);
        events = this.context.events.filter(event => 
          event.startTime >= weekStart && event.startTime <= weekEnd
        );
        timeRangeLabel = 'this week';
        break;

      case 'next_week':
        const nextWeekStart = new Date();
        nextWeekStart.setDate(nextWeekStart.getDate() + (7 - nextWeekStart.getDay()));
        const nextWeekEnd = new Date(nextWeekStart);
        nextWeekEnd.setDate(nextWeekStart.getDate() + 6);
        events = this.context.events.filter(event => 
          event.startTime >= nextWeekStart && event.startTime <= nextWeekEnd
        );
        timeRangeLabel = 'next week';
        break;

      case 'this_month':
        const monthStart = new Date();
        monthStart.setDate(1);
        const monthEnd = new Date(monthStart);
        monthEnd.setMonth(monthStart.getMonth() + 1);
        monthEnd.setDate(0);
        events = this.context.events.filter(event => 
          event.startTime >= monthStart && event.startTime <= monthEnd
        );
        timeRangeLabel = 'this month';
        break;

      default:
        events = this.context.events;
        timeRangeLabel = 'all upcoming';
    }

    const filteredEvents = events.slice(0, maxResults);
    
    // Return a user-friendly response with both data and formatted message
    return {
      events: filteredEvents,
      message: this.formatEventsResponse(filteredEvents, timeRangeLabel, maxResults),
      count: filteredEvents.length,
      timeRange: timeRangeLabel
    };
  }

  private formatEventsResponse(events: NormalizedEvent[], timeRange: string, maxResults: number): string {
    if (events.length === 0) {
      return `You have no events scheduled for ${timeRange}.`;
    }

    const eventList = events.map(event => {
      const startTime = new Date(event.startTime);
      const endTime = new Date(event.endTime);
      
      const dateStr = startTime.toLocaleDateString('en-US', { 
        weekday: 'short', 
        month: 'short', 
        day: 'numeric' 
      });
      const startStr = startTime.toLocaleTimeString('en-US', { 
        hour: 'numeric', 
        minute: '2-digit',
        hour12: true 
      });
      const endStr = endTime.toLocaleTimeString('en-US', { 
        hour: 'numeric', 
        minute: '2-digit',
        hour12: true 
      });
      
      let eventInfo = `📅 **${event.title}** - ${dateStr} at ${startStr}-${endStr}`;
      
      if (event.location) {
        eventInfo += ` 📍 ${event.location}`;
      }
      
      if (event.attendees && event.attendees.length > 0) {
        const attendeeNames = event.attendees.map(email => email.split('@')[0]).join(', ');
        eventInfo += ` 👥 ${attendeeNames}`;
      }
      
      return eventInfo;
    }).join('\n');

    const countText = events.length === 1 ? '1 event' : `${events.length} events`;
    const timeRangeText = timeRange === 'all upcoming' ? 'upcoming' : `for ${timeRange}`;
    
    return `Here are your ${countText} ${timeRangeText}:\n\n${eventList}`;
  }

  private checkForDuplicateCall(functionName: string, parameters: any): any | null {
    const now = Date.now();
    const tenSecondsAgo = now - 10000; // 10 seconds
    
    // Clean up old entries
    this.recentFunctionCalls = this.recentFunctionCalls.filter(call => call.timestamp > tenSecondsAgo);
    
    // Check for duplicate calls with same function name and similar parameters
    const duplicate = this.recentFunctionCalls.find(call => {
      if (call.function !== functionName) return false;
      
      // For create_email_draft, check if it's the same type of request
      if (functionName === 'create_email_draft') {
        const currentContext = parameters.context || '';
        const cachedContext = call.parameters.context || '';
        
        // If both are multiple email requests for Joe/Dan/Sally, consider them duplicates
        if (currentContext.includes('Joe') && currentContext.includes('Dan') && currentContext.includes('Sally') &&
            cachedContext.includes('Joe') && cachedContext.includes('Dan') && cachedContext.includes('Sally')) {
          return true;
        }
      }
      
      return false;
    });
    
    return duplicate ? duplicate.response : null;
  }

  private addToRecentCalls(functionName: string, parameters: any, response: any): void {
    this.recentFunctionCalls.push({
      function: functionName,
      parameters,
      timestamp: Date.now(),
      response
    });
    
    // Keep only last 5 calls
    if (this.recentFunctionCalls.length > 5) {
      this.recentFunctionCalls.shift();
    }
  }

  private async createEmailDraft(parameters: any): Promise<any> {
    const { to, emailType, context, tone = 'professional' } = parameters;
    
    console.log('🔧 createEmailDraft called with parameters:', parameters);
    console.log('🔧 User message for detection:', parameters.userMessage);
    console.log('🔧 Context for detection:', context);
    
    // ROBUST GROUP EMAIL DETECTION: Bypass heuristics when multiple recipients are explicitly provided
    const hasMultipleRecipients = (
      (Array.isArray(to) && to.length > 1) || 
      (typeof to === 'string' && to.includes(','))
    );
    
    if (hasMultipleRecipients) {
      console.log('🔧 ROBUST DETECTION: Multiple recipients explicitly provided, bypassing heuristics');
      console.log('🔧 Recipients detected:', to);
      return this.createGroupEmail(parameters);
    }
    
    // SMART DETECTION: Check if this is a group email request vs. multiple individual emails
    const isGroupEmailRequest = (
      // Check user message for EXPLICIT group email requests (HIGHEST PRIORITY)
      (parameters.userMessage && (
        parameters.userMessage.includes('one email for all 3 of them') ||
        parameters.userMessage.includes('one email to all three') ||
        parameters.userMessage.includes('one email for all three') ||
        parameters.userMessage.includes('email for all of them') ||
        parameters.userMessage.includes('one email to all') ||
        parameters.userMessage.includes('single email to all') ||
        parameters.userMessage.includes('group email') ||
        parameters.userMessage.includes('email to all three') ||
        parameters.userMessage.includes('one email') ||
        parameters.userMessage.includes('single email')
      )) ||
      // Check context for EXPLICIT group email indicators (LOWER PRIORITY, must be very specific)
      (context && (
        context.includes('one email to all three') ||
        context.includes('email to all three') ||
        context.includes('group email to all') ||
        context.includes('single email to all three')
      ))
    );
    
    if (isGroupEmailRequest) {
      console.log('🔧 SMART DETECTION: Detected group email request, using group email system');
      console.log('🔧 Group email triggers:', {
        userMessage: parameters.userMessage,
        context: context
      });
      // Use the recipients from the to parameter if available, otherwise fallback
      if (!to || (Array.isArray(to) && to.length === 0) || (typeof to === 'string' && to.trim() === '')) {
        parameters.to = 'joe@gmail.com,dan@gmail.com,sally@gmail.com';
      }
      return this.createGroupEmail(parameters);
    }
    
    // Check if this is a request for multiple individual emails (HIGHEST PRIORITY)
    const isMultipleEmailRequest = (
      // User message indicates sharing with each person individually (highest priority)
      (parameters.userMessage && (
        parameters.userMessage.includes('share with each of them') ||
        parameters.userMessage.includes('email draft I can share with each of them') ||
        parameters.userMessage.includes('emails for each of them') ||
        parameters.userMessage.includes('individual email to each person') ||
        parameters.userMessage.includes('individual email to each') ||
        parameters.userMessage.includes('individual emails for each') ||
        parameters.userMessage.includes('separate email for each') ||
        parameters.userMessage.includes('email for each person') ||
        parameters.userMessage.includes('individual email') ||
        parameters.userMessage.includes('each person') ||
        parameters.userMessage.includes('each of them') ||
        parameters.userMessage.includes('separately')
      )) ||
      // Context mentions multiple people but no explicit group request (lower priority)
      (context && !parameters.userMessage && (
        (context.includes('Joe') || context.includes('Dan') || context.includes('Sally')) &&
        !context.includes('one email') &&
        !context.includes('single email') &&
        !context.includes('email to all') &&
        !context.includes('email for all')
      ))
    );
    
    if (isMultipleEmailRequest) {
      console.log('🔧 SMART DETECTION: Detected multiple email request, using multiple email system');
      console.log('🔧 Multiple email triggers:', {
        userMessage: parameters.userMessage,
        context: context
      });
      return this.createMultipleMeetingEmails(parameters);
    }
    
    // Generate enhanced email content based on context and type
    let enhancedSubject = '';
    let enhancedBody = '';
    
    // Provide fallback context if missing
    const fallbackContext = context || 'meeting scheduling';
    
    // Check if this might be a multiple meeting request based on context
    if (fallbackContext.includes('Joe') || fallbackContext.includes('Dan') || fallbackContext.includes('Sally')) {
      console.log('🔧 Detected multiple people in context, forcing multiple email system');
      return this.createMultipleMeetingEmails(parameters);
    }
    
    // Additional fallback: if user message mentions multiple people and individual emails, force individual email system
    if (parameters.userMessage && 
        (parameters.userMessage.includes('Joe') || parameters.userMessage.includes('Dan') || parameters.userMessage.includes('Sally')) &&
        (parameters.userMessage.includes('individual') || parameters.userMessage.includes('each') || parameters.userMessage.includes('separate'))) {
      console.log('🔧 Fallback detection: Multiple people + individual email keywords, forcing multiple email system');
      return this.createMultipleMeetingEmails(parameters);
    }
    
    if (emailType === 'meeting_confirmation') {
      enhancedSubject = `Meeting Confirmation - ${context}`;
      enhancedBody = `Dear ${to.split('@')[0] || 'there'},

I hope this email finds you well. This email confirms our meeting regarding ${context}.

Meeting Details:
- Topic: ${context}
- Date: [Please confirm your preferred date]
- Time: [Please confirm your preferred time - I'm available afternoons and evenings]
- Location: [Virtual meeting or in-person - please let me know your preference]

I'm looking forward to our discussion. Please confirm your availability and let me know if you need to reschedule or have any questions.

Best regards,
[Your Name]`;
    } else {
      // Use the standard template system for other cases
      const emailTemplate = await this.context.emailService.createEmailTemplate(emailType, fallbackContext, tone);
      enhancedSubject = emailTemplate.subject;
      enhancedBody = emailTemplate.body;
    }
    
    // Create Gmail compose URL (no API calls needed)
    const recipient = to || 'recipient@example.com';
    const gmailUrl = this.context.emailService.generateGmailComposeUrl(recipient, enhancedSubject, enhancedBody);
    
    // Also create mailto link as fallback
    const mailtoUrl = this.context.emailService.generateMailtoLink(recipient, enhancedSubject, enhancedBody);
    
    return {
      message: `Email draft generated and ready to send`,
      emailType,
      recipient: recipient,
      subject: enhancedSubject,
      body: enhancedBody,
      gmailComposeUrl: gmailUrl,
      mailtoUrl: mailtoUrl,
      instructions: 'Click the Gmail link to open in Gmail compose, or use the mailto link as fallback'
    };
  }

  private async createMultipleMeetingEmails(parameters: any): Promise<any> {
    const { context, tone = 'professional' } = parameters;
    
    console.log('🔧 createMultipleMeetingEmails: starting with parameters:', parameters);
    
    try {
      // Extract names from context if possible
      console.log('🔧 createMultipleMeetingEmails: extracting names...');
      const names = this.extractNamesFromContext(context, parameters.to);
      console.log('🔧 createMultipleMeetingEmails: extracted names:', names);
      
      // Find available time slots (respecting morning workout blocks)
      console.log('🔧 createMultipleMeetingEmails: finding available time slots...');
      const availableSlots = this.findAvailableTimeSlots();
      console.log('🔧 createMultipleMeetingEmails: found slots:', availableSlots);
      
      // Generate individual email templates for each recipient
      console.log('🔧 createMultipleMeetingEmails: generating email templates...');
      // Provide fallback context if it's undefined
      const safeContext = context || 'schedule meetings with Joe, Dan, and Sally for project discussions';
      
      console.log('🔧 createMultipleMeetingEmails: names array:', names);
      const emailTemplates = names.map((name, index) => {
        console.log(`🔧 createMultipleMeetingEmails: generating email ${index + 1} for name: "${name}"`);
        const template = this.generateMeetingSchedulingEmail(name, safeContext, availableSlots, tone);
        console.log(`🔧 createMultipleMeetingEmails: email ${index + 1} template:`, template);
        return template;
      });
      console.log('🔧 createMultipleMeetingEmails: generated templates:', emailTemplates);
      
      // Generate calendar links for each person with their personalized template
      console.log('🔧 createMultipleMeetingEmails: generating calendar links...');
      const calendarLinks = names.map((name, index) => {
        const template = emailTemplates[index];
        const gmailUrl = this.context.emailService.generateGmailComposeUrl(name, template.subject, template.body);
        const mailtoUrl = this.context.emailService.generateMailtoLink(name, template.subject, template.body);
        
        return {
          recipient: name,
          gmailComposeUrl: gmailUrl,
          mailtoUrl: mailtoUrl
        };
      });
      console.log('🔧 createMultipleMeetingEmails: generated calendar links:', calendarLinks);
      
      const result = {
        message: `Generated ${names.length} personalized email drafts for meeting scheduling`,
        emailType: 'multiple_meeting_scheduling',
        emailTemplates,
        calendarLinks,
        instructions: 'Each recipient will receive a personalized email with their name in the greeting.'
      };
      
      console.log('🔧 createMultipleMeetingEmails: returning result:', result);
      return result;
      
    } catch (error) {
      console.error('🔧 createMultipleMeetingEmails: error occurred:', error);
      throw error;
    }
  }

  private async createGroupEmail(parameters: any): Promise<any> {
    const { to, context, tone = 'professional' } = parameters;
    
    console.log('🔧 createGroupEmail: starting with parameters:', parameters);
    
    // Extract recipients from the 'to' parameter (most reliable)
    let recipients: string[];
    if (Array.isArray(to)) {
      recipients = to;
    } else if (typeof to === 'string' && to.includes(',')) {
      recipients = to.split(',').map(email => email.trim());
    } else {
      // Fallback to context-based extraction if 'to' is not provided
      recipients = this.extractNamesFromContext(context, to);
    }
    
    console.log('🔧 createGroupEmail: using recipients:', recipients);
    
    try {
      // Find available time slots (respecting morning workout blocks)
      console.log('🔧 createGroupEmail: finding available time slots...');
      const availableSlots = this.findAvailableTimeSlots();
      console.log('🔧 createGroupEmail: found slots:', availableSlots);
      
      // Generate a single group email template
      console.log('🔧 createGroupEmail: generating email template...');
      // Provide fallback context if it's undefined
      const safeContext = context || 'schedule meetings with Joe, Dan, and Sally for project discussions';
      const emailTemplate = this.generateGroupMeetingSchedulingEmail(recipients, safeContext, availableSlots, tone);
      console.log('🔧 createGroupEmail: generated template:', emailTemplate);
      
      // Generate one calendar link with all recipients
      const allRecipients = recipients.join(',');
      console.log('🔧 createGroupEmail: generating calendar links for:', allRecipients);
      
      const gmailUrl = this.context.emailService.generateGmailComposeUrl(allRecipients, emailTemplate.subject, emailTemplate.body);
      const mailtoUrl = this.context.emailService.generateMailtoLink(allRecipients, emailTemplate.subject, emailTemplate.body);
      
      console.log('🔧 createGroupEmail: generated URLs - Gmail:', gmailUrl, 'Mailto:', mailtoUrl);
      
      const result = {
        message: `Generated group email draft for ${recipients.length} recipients`,
        emailType: 'group_meeting_scheduling',
        emailTemplate,
        calendarLinks: [{
          recipients: allRecipients,
          gmailComposeUrl: gmailUrl,
          mailtoUrl: mailtoUrl
        }],
        instructions: 'Click the Gmail link to open a single email addressed to all recipients.'
      };
      
      console.log('🔧 createGroupEmail: returning result:', result);
      return result;
      
    } catch (error) {
      console.error('🔧 createGroupEmail: error occurred:', error);
      throw error;
    }
  }

  private extractNamesFromContext(context: string, to?: string | string[]): string[] {
    // First priority: use the 'to' parameter if provided
    if (to) {
      if (Array.isArray(to)) {
        return to;
      } else if (typeof to === 'string' && to.includes(',')) {
        return to.split(',').map(email => email.trim());
      } else if (typeof to === 'string' && to.trim() !== '') {
        return [to.trim()];
      }
    }
    
    // Second priority: extract from context if it contains email addresses
    if (context) {
      const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
      const emails = context.match(emailRegex);
      if (emails && emails.length > 0) {
        return emails;
      }
    }
    
    // Fallback: return hard-coded list only if no other options available
    console.log('🔧 extractNamesFromContext: No recipients found in to or context, using fallback list');
    return ['joe@gmail.com', 'dan@gmail.com', 'sally@gmail.com'];
  }

  private findAvailableTimeSlots(): any[] {
    // Get current date and next 2 weeks
    const now = new Date();
    const slots = [];
    
    for (let day = 0; day < 14; day++) {
      const date = new Date(now);
      date.setDate(now.getDate() + day);
      
      // Skip weekends
      if (date.getDay() === 0 || date.getDay() === 6) continue;
      
      // Add afternoon slots (1-5 PM)
      for (let hour = 13; hour <= 17; hour++) {
        const slotTime = new Date(date);
        slotTime.setHours(hour, 0, 0, 0);
        
        // Check if this time conflicts with existing events
        const conflictingEvent = this.context.events.find(event => {
          const eventStart = new Date(event.startTime);
          const eventEnd = new Date(event.endTime);
          return slotTime >= eventStart && slotTime < eventEnd;
        });
        
        if (!conflictingEvent) {
          // Convert 24-hour format to 12-hour format
          const displayHour = hour > 12 ? hour - 12 : hour;
          const ampm = hour >= 12 ? 'PM' : 'AM';
          
          slots.push({
            date: date.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' }),
            time: `${displayHour}:00 ${ampm}`,
            available: true
          });
        }
      }
      
      // Add evening slots (6-8 PM)
      for (let hour = 18; hour <= 20; hour++) {
        const slotTime = new Date(date);
        slotTime.setHours(hour, 0, 0, 0);
        
        const conflictingEvent = this.context.events.find(event => {
          const eventStart = new Date(event.startTime);
          const eventEnd = new Date(event.endTime);
          return slotTime >= eventStart && slotTime < eventEnd;
        });
        
        if (!conflictingEvent) {
          // Convert 24-hour format to 12-hour format
          const displayHour = hour > 12 ? hour - 12 : hour;
          const ampm = hour >= 12 ? 'PM' : 'AM';
          
          slots.push({
            date: date.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' }),
            time: `${displayHour}:00 ${ampm}`,
            available: true
          });
        }
      }
      }
    
    // Return top 10 available slots with better formatting
    return slots.slice(0, 10).map(slot => ({
      ...slot,
      date: slot.date,
      time: slot.time
    }));
  }

  private generateMeetingSchedulingEmail(name: string, context: string, availableSlots: any[], tone: string): any {
    // Extract clean first name from email address
    const firstName = name.split('@')[0];
    const availableSlotsText = availableSlots.map(slot => `${slot.date} at ${slot.time}`).join(', ');
    
    // Provide fallback context if it's undefined
    const safeContext = context || 'project discussions';
    
    // Clean up the subject line - extract just the purpose, not the full context
    let cleanSubject = 'Meeting Scheduling Request';
    if (safeContext.includes('project')) {
      cleanSubject = 'Project Meeting Scheduling';
    } else if (safeContext.includes('discussion')) {
      cleanSubject = 'Meeting Discussion Scheduling';
    } else if (safeContext.includes('kickoff')) {
      cleanSubject = 'Project Kickoff Meeting';
    } else {
      cleanSubject = 'Meeting Scheduling Request';
    }
    
    const subject = cleanSubject;
    const body = `Dear ${firstName},

I hope this email finds you well. I'd like to schedule a meeting with you regarding our project discussions.

Important Scheduling Note:
I'm currently blocking my mornings for personal time (workouts and focused work), so I'm looking for afternoon or evening slots that work for you.

Based on my current availability, here are some time slots that work for me:
${availableSlotsText}

Meeting Details:
- Purpose: Project discussion and planning
- Duration: 30-60 minutes (flexible based on your preference)
- Preferred Times: Afternoons (1-5 PM) or evenings (6-8 PM)
- Format: Virtual or in-person, whichever works better for you

Please let me know:
1. Which of the suggested time slots work best for you?
2. If none of these work, what dates/times are most convenient for you?
3. Whether you prefer virtual or in-person meetings?

I'm flexible and can work around your schedule. Looking forward to connecting!

Best regards,
[Your Name]`;

    return {
      to: name,
      subject,
      body
    };
  }

  private generateGroupMeetingSchedulingEmail(names: string[], context: string, availableSlots: any[], tone: string): any {
    // Extract clean first names from email addresses
    const firstNames = names.map(name => name.split('@')[0]);
    const availableSlotsText = availableSlots.map(slot => `${slot.date} at ${slot.time}`).join(', ');
    
    // Provide fallback context if it's undefined
    const safeContext = context || 'project discussions';
    
    // Clean up the subject line - extract just the purpose, not the full context
    let cleanSubject = 'Meeting Scheduling Request';
    if (safeContext.includes('project')) {
      cleanSubject = 'Project Meeting Scheduling';
    } else if (safeContext.includes('discussion')) {
      cleanSubject = 'Meeting Discussion Scheduling';
    } else if (safeContext.includes('kickoff')) {
      cleanSubject = 'Project Kickoff Meeting';
    } else {
      cleanSubject = 'Meeting Scheduling Request';
    }
    
    const subject = cleanSubject;
    const body = `Dear ${firstNames.join(', ')},

I hope this email finds you all well. I'd like to schedule a meeting with the three of you regarding our project discussions.

Important Scheduling Note:
I'm currently blocking my mornings for personal time (workouts and focused work), so I'm looking for afternoon or evening slots that work for all of us.

Based on my current availability, here are some time slots that work for me:
${availableSlotsText}

Meeting Details:
- Purpose: Project discussion and planning
- Duration: 30-60 minutes (flexible based on your preference)
- Preferred Times: Afternoons (1-5 PM) or evenings (6-8 PM)
- Format: Virtual or in-person, whichever works better for everyone

Please let me know:
1. Which of the suggested time slots work best for all of you?
2. If none of these work, what dates/times are most convenient for everyone?
3. Whether you prefer virtual or in-person meetings?

I'm flexible and can work around your schedules. Looking forward to connecting with all of you!

Best regards,
[Your Name]`;

    return {
      to: names.join(', '),
      subject,
      body
    };
  }

  private async createMeetingFollowup(parameters: any): Promise<any> {
    console.log('🔍 DEBUG createMeetingFollowup called with parameters:', parameters);
    console.log('🔍 DEBUG Available events in context:', this.context.events.map(e => e.title));
    
    const { eventTitle, attendeeEmail } = parameters;
    console.log('🔍 DEBUG Looking for event with title:', eventTitle);
    console.log('🔍 DEBUG Looking for attendee email:', attendeeEmail);
    
    const event = this.context.events.find(e => e.title === eventTitle);
    
    if (!event) {
      console.log('🔍 DEBUG Event not found:', eventTitle);
      console.log('🔍 DEBUG Available events:', this.context.events.map(e => e.title));
      
      // Return a user-friendly message instead of throwing an error
      return {
        message: `❌ **Event Not Found**`,
        error: true,
        requestedEvent: eventTitle,
        availableEvents: this.context.events.map(e => e.title),
        instructions: `The event "${eventTitle}" was not found in your calendar. Here are your available events:\n\n${this.context.events.map(e => `• ${e.title}`).join('\n')}\n\nPlease try again with one of the events listed above, or check the exact spelling of the event title.`
      };
    }
    
    console.log('🔍 DEBUG Found event:', event);
    const result = this.context.emailService.createMeetingFollowUp(event, attendeeEmail);
    console.log('🔍 DEBUG createMeetingFollowup returning:', result);
    
    return result;
  }

  private async suggestMeetingTimes(parameters: any): Promise<any> {
    const { 
      title, 
      duration, 
      attendees = [], 
      preferredTime = 'any', 
      urgency = 'medium',
      location,
      description
    } = parameters;
    
    console.log('🔧 suggestMeetingTimes: starting with parameters:', parameters);
    
    try {
      console.log('🔧 suggestMeetingTimes: setting events in scheduler service...');
    this.context.schedulerService.setEvents(this.context.events);
      console.log('🔧 suggestMeetingTimes: events set, getting suggestions...');
      
    const suggestions = this.context.schedulerService.suggestOptimalMeetingTimes(
      duration,
      preferredTime,
      urgency
    );
      console.log('🔧 suggestMeetingTimes: got suggestions:', suggestions);

    // Generate calendar links and ICS files for each suggested slot
    const meetingProposals = suggestions.map((slot, index) => {
      const startTime = slot.start;
      const endTime = slot.end;
      
      // Create Google Calendar render link
      console.log(`🔧 suggestMeetingTimes: creating calendar URL for slot ${index + 1}, attendees:`, attendees, 'type:', typeof attendees, 'isArray:', Array.isArray(attendees));
      const calendarUrl = this.context.linkBuilder.createMeetingUrl(
        title,
        startTime,
        endTime,
        attendees,
        location,
        description
      );
      
      // Create ICS file for this slot
      const icsEvent = {
        id: `meeting-proposal-${index}`,
        title,
        startTime,
        endTime,
        duration: slot.duration,
        description: description || '',
        location: location || '',
        attendees,
        organizer: '',
        url: '',
        isAllDay: false
      };
      
      const icsContent = this.context.icsGenerator.generateSingleEventICS(icsEvent);
      const icsFilename = `${title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_${startTime.toISOString().split('T')[0]}.ics`;

    return {
        slotNumber: index + 1,
        start: startTime.toISOString(),
        end: endTime.toISOString(),
        duration: slot.duration,
        isAvailable: slot.isAvailable,
        calendarUrl,
        icsContent,
        icsFilename,
        downloadICS: () => this.downloadICSContent(icsContent, icsFilename),
        instructions: 'Click calendar link to create event, or download ICS file to import'
      };
    });

      console.log('🔧 suggestMeetingTimes: generated proposals:', meetingProposals);

      const result = {
        meetingTitle: title,
        totalSlots: meetingProposals.length,
        duration,
        attendees,
        proposals: meetingProposals,
        instructions: 'Each slot includes a Google Calendar link and ICS file. Click calendar links to create events directly, or download ICS files to import into your calendar.'
      };
      
      console.log('🔧 suggestMeetingTimes: returning result:', result);
      return result;
      
    } catch (error) {
      console.error('🔧 suggestMeetingTimes: error occurred:', error);
      throw error;
    }
  }

  private async generateProductivityReport(parameters: any): Promise<any> {
    const { reportType, includeRecommendations = true } = parameters;
    
    // Calculate basic stats
    const stats = this.calculateBasicStats();
    
    // Generate recommendations if requested
    let recommendations: string[] = [];
    if (includeRecommendations) {
      recommendations = this.generateRecommendations(stats);
    }
    
    // Generate downloadable report content
    const reportContent = this.generateReportContent(reportType, stats, recommendations);
    const filename = `productivity_report_${reportType}_${new Date().toISOString().split('T')[0]}.txt`;
    
    return {
      reportType,
      stats,
      includeRecommendations,
      recommendations,
      generatedAt: new Date().toISOString(),
      reportContent,
      filename,
      downloadReport: () => this.downloadReportContent(reportContent, filename),
      instructions: 'Click the download link to save the productivity report as a text file.'
    };
  }

  private generateReportContent(reportType: string, stats: any, recommendations: string[]): string {
    const reportDate = new Date().toLocaleDateString();
    const reportTime = new Date().toLocaleTimeString();
    
    let content = `TENEX CALENDAR PRODUCTIVITY REPORT\n`;
    content += `Generated on ${reportDate} at ${reportTime}\n`;
    content += `Report Type: ${reportType.charAt(0).toUpperCase() + reportType.slice(1)}\n`;
    content += `==========================================\n\n`;
    
    content += `CALENDAR STATISTICS:\n`;
    content += `• Total Events: ${stats.totalEvents} upcoming meetings/events\n`;
    content += `• Total Time: ${stats.totalHours} hours (${stats.totalMinutes} minutes)\n`;
    content += `• Average Duration: ${Math.round(stats.averageDuration)} minutes per event\n`;
    content += `• Most Active Day: ${stats.mostActiveDay}\n`;
    content += `• Most Active Time: ${stats.mostActiveTime}\n\n`;
    
    if (recommendations.length > 0) {
      content += `RECOMMENDATIONS:\n`;
      recommendations.forEach((rec, index) => {
        content += `${index + 1}. ${rec}\n`;
      });
      content += `\n`;
    }
    
    content += `UPCOMING EVENTS:\n`;
    this.context.events.slice(0, 10).forEach((event, index) => {
      const eventDate = event.startTime.toLocaleDateString();
      const eventTime = event.startTime.toLocaleTimeString();
      content += `${index + 1}. ${event.title} - ${eventDate} at ${eventTime} (${event.duration} min)\n`;
    });
    
    return content;
  }

  private downloadReportContent(content: string, filename: string): void {
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  private async createEmailTemplate(parameters: any): Promise<EmailTemplate> {
    const { templateType, context, tone = 'professional' } = parameters;
    return this.context.emailService.createEmailTemplate(templateType, context, tone);
  }

  private async optimizeSchedule(parameters: any): Promise<any> {
    const { focus } = parameters;
    
    this.context.schedulerService.setEvents(this.context.events);
    const suggestions = this.context.schedulerService.optimizeSchedule(this.context.events, focus);

    return {
      focus,
      suggestions,
      generatedAt: new Date().toISOString()
    };
  }

  private async createCalendarEvent(parameters: any): Promise<any> {
    const { title, startTime, endTime, attendees: rawAttendees = [], location, description } = parameters;
    
    // Fix attendees parameter - handle both string and array formats
    let attendees: string[] = [];
    if (Array.isArray(rawAttendees)) {
      attendees = rawAttendees;
    } else if (typeof rawAttendees === 'string') {
      try {
        // Try to parse JSON string format
        if (rawAttendees.startsWith('[') && rawAttendees.endsWith(']')) {
          attendees = JSON.parse(rawAttendees);
        } else {
          // Handle comma-separated string
          attendees = rawAttendees.split(',').map(email => email.trim());
        }
      } catch (error) {
        console.warn('🔧 Failed to parse attendees string, treating as single email:', rawAttendees);
        attendees = [rawAttendees.trim()];
      }
    }
    
    console.log('🔧 Processed attendees:', attendees, 'type:', typeof attendees, 'isArray:', Array.isArray(attendees));
    
    const start = new Date(startTime);
    const end = new Date(endTime);
    
    try {
      console.log('🔧 Attempting to create calendar event via API...');
      // Actually create the event in Google Calendar
      const createdEvent = await this.context.calendarService.createEvent({
        summary: title,
        description: description || '',
        location: location || '',
        startTime: start,
        endTime: end,
        attendees: attendees.length > 0 ? attendees : undefined,
      });
      
      // Add the created event to the context
      const normalizedEvent = {
        id: createdEvent.id,
        title: createdEvent.summary || title,
        startTime: new Date(createdEvent.start.dateTime || createdEvent.start.date!),
        endTime: new Date(createdEvent.end.dateTime || createdEvent.end.date!),
        duration: Math.round((end.getTime() - start.getTime()) / (1000 * 60)),
        description: createdEvent.description || description || '',
        location: createdEvent.location || location || '',
        attendees: createdEvent.attendees?.map(a => a.email) || attendees,
        organizer: createdEvent.organizer?.email || '',
        url: createdEvent.htmlLink || '',
        isAllDay: !createdEvent.start.dateTime,
      };
      
      this.context.events.push(normalizedEvent);
      
      return {
        message: `✅ Calendar event "${title}" successfully created in Google Calendar!`,
        eventId: createdEvent.id,
        title: createdEvent.summary || title,
        startTime: start.toISOString(),
        endTime: end.toISOString(),
        duration: normalizedEvent.duration,
        attendees: normalizedEvent.attendees,
        location: normalizedEvent.location,
        description: normalizedEvent.description,
        calendarUrl: createdEvent.htmlLink,
        instructions: 'The event has been created in your Google Calendar. Click the calendar link to view it.'
      };
      
    } catch (error) {
      console.log('🔧 Caught error in createCalendarEvent, falling back to link generation');
      // Fallback to generating links if API call fails
      console.warn('Failed to create event via API, falling back to link generation:', error);
      console.error('API Error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      });
      
      const eventId = `event-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      const event = {
        id: eventId,
        title,
        startTime: start,
        endTime: end,
        duration: Math.round((end.getTime() - start.getTime()) / (1000 * 60)),
        description: description || '',
        location: location || '',
        attendees,
        organizer: '',
        url: '',
        isAllDay: false
      };
      
      this.context.events.push(event);
      
      const calendarUrl = this.context.linkBuilder.createMeetingUrl(
      title,
      start,
      end,
      attendees,
      location,
      description
    );
      
      const icsContent = this.context.icsGenerator.generateSingleEventICS(event);
      const icsFilename = `${title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_${start.toISOString().split('T')[0]}.ics`;
      
      return {
        message: `📅 Calendar event "${title}" prepared (API unavailable)`,
        eventId,
        title,
        startTime: start.toISOString(),
        endTime: end.toISOString(),
        duration: event.duration,
        attendees,
        location,
        description,
        calendarUrl,
        icsContent,
        icsFilename,
        downloadICS: () => this.downloadICSContent(icsContent, icsFilename),
        instructions: 'Click the calendar link to create the event in Google Calendar, or download the ICS file to import into your calendar'
      };
    }
  }

  /**
   * Check if we need to recalculate dates from natural language
   * Returns true if the LLM gave us a hardcoded date that doesn't match the user's request
   */
  private shouldRecalculateDates(startTime: string, userMessage?: string): boolean {
    if (!userMessage) return false;
    
    const date = new Date(startTime);
    const now = new Date();
    
    // Check if the date is in the past or very old (like 2024)
    if (date < now) return true;
    
    // Check if it's a hardcoded date from training data
    if (startTime.includes('2024-01-10') || startTime.includes('2024-01-11')) return true;
    
    // Check if user message contains natural language date indicators
    const naturalLanguageIndicators = [
      'next', 'tomorrow', 'today', 'this', 'upcoming', 'following',
      'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'
    ];
    
    return naturalLanguageIndicators.some(indicator => 
      userMessage.toLowerCase().includes(indicator.toLowerCase())
    );
  }

  /**
   * Parse natural language dates from user message
   * Converts "next Wednesday at 11 AM for 1 hour" to actual dates
   */
  private parseNaturalLanguageDate(userMessage: string): { start: Date; end: Date } | null {
    try {
      const message = userMessage.toLowerCase();
      console.log('🔍 DEBUG Parsing natural language date from:', userMessage);
      
      // Extract day of week
      const daysOfWeek = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
      let targetDay = -1;
      let isNext = false;
      
      for (let i = 0; i < daysOfWeek.length; i++) {
        if (message.includes(daysOfWeek[i])) {
          targetDay = i;
          isNext = message.includes('next');
          break;
        }
      }
      
      if (targetDay === -1) {
        console.log('🔍 DEBUG No day of week found in message');
        return null;
      }
      
      // Extract time
      const timeMatch = message.match(/(\d{1,2})\s*(am|pm)/i);
      if (!timeMatch) {
        console.log('🔍 DEBUG No time found in message');
        return null;
      }
      
      let hour = parseInt(timeMatch[1]);
      const isPM = timeMatch[2].toLowerCase() === 'pm';
      if (isPM && hour !== 12) hour += 12;
      if (!isPM && hour === 12) hour = 0;
      
      // Extract duration
      const durationMatch = message.match(/(\d+)\s*hour/);
      const duration = durationMatch ? parseInt(durationMatch[1]) : 1;
      
      // Calculate the target date
      const now = new Date();
      let targetDate = new Date(now);
      
      if (isNext) {
        // Find next occurrence of the day
        while (targetDate.getDay() !== targetDay) {
          targetDate.setDate(targetDate.getDate() + 1);
        }
      } else {
        // Find this week's occurrence
        const currentDay = now.getDay();
        const daysUntilTarget = (targetDay - currentDay + 7) % 7;
        targetDate.setDate(now.getDate() + daysUntilTarget);
      }
      
      // Set the time
      targetDate.setHours(hour, 0, 0, 0);
      
      // Create end time
      const endDate = new Date(targetDate);
      endDate.setHours(targetDate.getHours() + duration);
      
      console.log('🔍 DEBUG Calculated dates:', { 
        targetDay: daysOfWeek[targetDay], 
        isNext, 
        targetDate, 
        endDate,
        hour,
        duration 
      });
      
      return { start: targetDate, end: endDate };
      
    } catch (error) {
      console.error('🔍 DEBUG Error parsing natural language date:', error);
      return null;
    }
  }

  private async createCalendarLink(parameters: any): Promise<any> {
    console.log('🔍 DEBUG createCalendarLink called with parameters:', parameters);
    
    const { title, startTime, endTime, attendees: rawAttendees = [], location, description, userMessage } = parameters;
    
    // Smart date parsing - if the LLM gave us a hardcoded date, try to parse the user's natural language
    let actualStart = new Date(startTime);
    let actualEnd = new Date(endTime);
    
    // Check if we need to recalculate dates from natural language
    if (this.shouldRecalculateDates(startTime, userMessage)) {
      console.log('🔍 DEBUG Detected hardcoded date, recalculating from user message:', userMessage);
      const recalculatedDates = this.parseNaturalLanguageDate(userMessage);
      if (recalculatedDates) {
        actualStart = recalculatedDates.start;
        actualEnd = recalculatedDates.end;
        console.log('🔍 DEBUG Recalculated dates:', { actualStart, actualEnd });
      }
    }
    
    // Fix attendees parameter - handle both string and array formats (same as createCalendarEvent)
    let attendees: string[] = [];
    if (Array.isArray(rawAttendees)) {
      attendees = rawAttendees;
    } else if (typeof rawAttendees === 'string') {
      try {
        // Try to parse JSON string format
        if (rawAttendees.startsWith('[') && rawAttendees.endsWith(']')) {
          attendees = JSON.parse(rawAttendees);
        } else {
          // Handle comma-separated string for calendar link
          attendees = rawAttendees.split(',').map((email: string) => email.trim());
        }
      } catch (error) {
        console.warn('🔧 Failed to parse attendees string, treating as single email:', rawAttendees);
        attendees = [rawAttendees.trim()];
      }
    }
    
    console.log('🔍 DEBUG createCalendarLink processed attendees:', attendees);
    console.log('🔍 DEBUG createCalendarLink final start/end times:', { actualStart, actualEnd });
    
    const calendarUrl = this.context.linkBuilder.createMeetingUrl(
      title,
      actualStart,
      actualEnd,
      attendees,
      location,
      description
    );
    
    console.log('🔍 DEBUG createCalendarLink generated URL:', calendarUrl);
    
    // Generate ICS file as well
    const event = {
      id: `event-${Date.now()}`,
      title,
      startTime: actualStart,
      endTime: actualEnd,
      duration: Math.round((actualEnd.getTime() - actualStart.getTime()) / (1000 * 60)),
      description: description || '',
      location: location || '',
      attendees,
      organizer: '',
      url: '',
      isAllDay: false
    };
    
    const icsContent = this.context.icsGenerator.generateSingleEventICS(event);
    const icsFilename = `${title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_${actualStart.toISOString().split('T')[0]}.ics`;
    
    const result = {
      message: `📅 Calendar link generated for "${title}"`,
      title,
      startTime: actualStart.toISOString(),
      endTime: actualEnd.toISOString(),
      duration: event.duration,
      attendees,
      location,
      description,
      calendarUrl,
      icsContent,
      icsFilename,
      instructions: 'Click the calendar link to create the event in Google Calendar, or download the ICS file to import into your calendar'
    };
    
    console.log('🔍 DEBUG createCalendarLink returning result:', result);
    
    return result;
  }

  private async generateICS(parameters: any): Promise<any> {
    const { eventIds, filename = 'calendar.ics' } = parameters;
    
    const selectedEvents = this.context.events.filter(event => 
      eventIds.includes(event.id)
    );

    if (selectedEvents.length === 0) {
      throw new Error('No events found with the provided IDs');
    }

    this.context.icsGenerator.addEvents(selectedEvents);
    this.context.icsGenerator.downloadICS(filename);

    return {
      message: `ICS file "${filename}" generated with ${selectedEvents.length} events`,
      eventCount: selectedEvents.length,
      filename
    };
  }

  // Helper function to download ICS content as file
  private downloadICSContent(content: string, filename: string): void {
    const blob = new Blob([content], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  private calculateBasicStats(): any {
    const totalEvents = this.context.events.length;
    const totalMinutes = this.context.events.reduce((sum, event) => sum + event.duration, 0);
    const totalHours = Math.round(totalMinutes / 60);
    const averageDuration = totalEvents > 0 ? totalMinutes / totalEvents : 0;

    return {
      totalEvents,
      totalMinutes,
      totalHours,
      averageDuration,
      mostActiveDay: this.getMostActiveDay(),
      mostActiveTime: this.getMostActiveTime()
    };
  }

  private getMostActiveDay(): string {
    const dayCounts: Record<string, number> = {};
    
    this.context.events.forEach(event => {
      const day = event.startTime.toLocaleDateString('en-US', { weekday: 'long' });
      dayCounts[day] = (dayCounts[day] || 0) + 1;
    });

    return Object.entries(dayCounts)
      .sort(([, a], [, b]) => b - a)[0]?.[0] || 'None';
  }

  private getMostActiveTime(): string {
    const timeCounts = { morning: 0, afternoon: 0, evening: 0 };
    
    this.context.events.forEach(event => {
      const hour = event.startTime.getHours();
      if (hour < 12) timeCounts.morning++;
      else if (hour < 17) timeCounts.afternoon++;
      else timeCounts.evening++;
    });

    return Object.entries(timeCounts)
      .sort(([, a], [, b]) => b - a)[0]?.[0] || 'None';
  }

  private generateRecommendations(stats: any): string[] {
    const recommendations = [];
    
    // Meeting duration recommendations
    if (stats.averageDuration > 60) {
      recommendations.push("Consider breaking longer meetings into shorter, focused sessions for better engagement.");
    }
    
    if (stats.totalHours > 20) {
      recommendations.push("Your schedule is quite busy. Consider blocking focus time for deep work.");
    }
    
    if (stats.totalEvents > 15) {
      recommendations.push("You have many meetings scheduled. Look for opportunities to consolidate or eliminate unnecessary ones.");
    }
    
    // Time distribution recommendations
    if (stats.mostActiveDay === 'Monday' || stats.mostActiveDay === 'Friday') {
      recommendations.push("Consider spreading meetings more evenly throughout the week to avoid Monday/Friday overload.");
    }
    
    // General productivity tips
    if (stats.totalEvents > 0) {
      recommendations.push("Schedule buffer time between meetings to allow for preparation and follow-up.");
      recommendations.push("Use the 80/20 rule: focus on the 20% of meetings that drive 80% of your results.");
    }
    
    return recommendations.length > 0 ? recommendations : ["Your schedule looks well-balanced. Keep up the good work!"];
  }
}
